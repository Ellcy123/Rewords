import { describe, expect, it, vi } from "vitest";
import { CaseDialogueProvider, buildCasePrompt, fallbackDialogue, fallbackEnding, type CaseContext } from "../server/src/caseProvider.ts";
import { createInitialState } from "../server/src/gameService.ts";
import { demoBootstrap } from "../packages/shared/src/index.ts";
function context(npcId = "npc_koharu"): CaseContext {
  const state=createInitialState();state.currentLocationId=state.npcStates[npcId].currentLocationId;state.activeNpcId=npcId;state.phase="encounter";
  return {state,npcId,mode:"talk",selectedOption:null,giftItem:null,effect:""};
}
function response(body:unknown) { return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:JSON.stringify(body)}}]}),{status:200}); }
function draft(c:CaseContext) {
  return {line:"你要看车票？给，你看这两个座位号。",stage_direction:"把两张票并排放好。",emotion:"认真",
    continuations:[{speaker:"npc",line:"先看看车票，还是让我接着说？",emotion:"等待"}],
    options:[
      {text:"看看车票",intent:"请求查看票面",angle:"核对",anchor:"看看车票",action_id:"show:E01"},
      {text:"票不能说明一切。",intent:"质疑车票能证明死亡性质",angle:"质疑",anchor:"车票",action_id:null}
    ],used_fact_ids:["F02"],accept_action:false};
}
describe("new case natural dialogue provider",()=>{
  it.each(demoBootstrap.npcs.map(n=>n.id))("scopes private knowledge for %s",npcId=>{
    const p=buildCasePrompt(context(npcId));const u=JSON.parse(p.user);
    if(npcId!=="npc_ritsu"){expect(p.known).not.toContain("F08");expect(p.user).not.toContain("故意将她推下");}
    expect(u.role.name).toBe(demoBootstrap.npcs.find(n=>n.id===npcId)!.name);
    expect(p.system).toContain("先接玩家刚说的这句话");
  });
  it("provides the player's selected wording, not an old choice's authoring instruction",()=>{
    const c=context();c.selectedOption={id:"daily",text:"先歇一会儿。",playerLine:"先歇一会儿。",intent:"暂时闲聊"};
    expect(JSON.parse(buildCasePrompt(c).user).player_just_said).toBe("先歇一会儿。");
  });
  it("has a safe, playable fallback for every NPC",async()=>{
    const p=new CaseDialogueProvider({apiKey:""});
    for(const n of demoBootstrap.npcs){
      const d=await p.generate(context(n.id));expect(d.speakerId).toBe(n.id);expect(d.options.length).toBeGreaterThan(1);
      expect(d.options.every(o=>o.text.length<=12)).toBe(true);
      expect(d.line+d.continuations.map(b=>b.line).join("")).not.toMatch(/零号站台|17:47/);
    }
  });
  it("accepts constrained natural output and keeps semantic option labels",async()=>{
    const c=context();const fetchImpl=vi.fn(async()=>response(draft(c))) as unknown as typeof fetch;
    const p=new CaseDialogueProvider({apiKey:"unit-test",fetchImpl,review:false});
    const d=await p.generate(c);expect(d.debug.provider).toBe("deepseek");
    expect(d.options[0].text).toBe("看看车票");
    const sent=JSON.parse((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sent.messages[0].content).toContain("玩家首句已由UI播放");
    expect(JSON.stringify(p.getLogs())).not.toContain("unit-test");
  });
  it("rejects foreign facts and falls back without poisoning memory",async()=>{
    const c=context(), d={...draft(c),used_fact_ids:["F08"]};
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:async()=>response(d)});
    expect((await p.generate(c)).debug.provider).toBe("mock_fallback");
    expect(p.getLogs()[0].success).toBe(false);
  });
  it("rejects arbitrary executable actions",async()=>{
    const c=context(),d=draft(c);d.options[0].action_id="kill_everyone";
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:async()=>response(d)});
    expect((await p.generate(c)).debug.provider).toBe("mock_fallback");
  });
  it("rejects speaking for the unselected player at opening",async()=>{
    const c=context();const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:async()=>response({...draft(c),continuations:[{speaker:"player",line:"给我看看。",emotion:"平静"}]})});
    expect((await p.generate(c)).debug.provider).toBe("mock_fallback");
    expect(p.getLogs()[0].errorCode).toBe("unselected_player_speech");
  });
  it("rejects saying an evidence item was shown while refusing the action",async()=>{
    const c=context();c.effect="show:E01";c.selectedOption={id:"show:E01",text:"看看车票",intent:"请求出示"};
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:async()=>response({...draft(c),line:"看吧，这就是车票。",options:[],accept_action:false})});
    await expect(p.generate(c)).rejects.toThrow("会面还没结束");expect(p.getLogs()[0].errorCode).toBe("action_mismatch");
  });
  it("retries malformed responses, but stops on authentication errors",async()=>{
    const c=context();const fn=vi.fn().mockResolvedValueOnce(new Response("bad",{status:200})).mockResolvedValueOnce(response(draft(c)));
    const p=new CaseDialogueProvider({apiKey:"unit-test",fetchImpl:fn,review:false});
    expect((await p.generate(c)).debug.provider).toBe("deepseek");expect(fn).toHaveBeenCalledTimes(2);
    const bad=vi.fn(async()=>new Response("",{status:401}));const q=new CaseDialogueProvider({apiKey:"unit-test",fetchImpl:bad});
    expect((await q.generate(c)).debug.provider).toBe("mock_fallback");expect(bad).toHaveBeenCalledTimes(1);
  });
  it("doesn't even call planning API before actual retraction delivery",async()=>{
    const fn=vi.fn();const p=new CaseDialogueProvider({apiKey:"unit-test",fetchImpl:fn});
    expect(await p.plan(createInitialState(),"npc_ritsu")).toBe("withdraw");expect(fn).not.toHaveBeenCalled();
  });
  it("validates planning enum and safely degrades to contact",async()=>{
    const s=createInitialState();s.npcStates.npc_ritsu.knownFactIds.push("R01");
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:async()=>response({intent:"kill_everyone"})});
    expect(await p.plan(s,"npc_ritsu")).toBe("approach");
  });
  it("doesn't claim to give the presented gift twice",()=>{
    const c=context();c.mode="gift";c.giftItem=demoBootstrap.items[0];
    expect(fallbackDialogue(c).line).toContain("我先收下了");
  });
  it("runs an independent fact check before accepting dialogue",async()=>{
    const c=context();const fn=vi.fn().mockResolvedValueOnce(response(draft(c))).mockResolvedValueOnce(response({approved:true,reason:"none"}));
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:fn});
    expect((await p.generate(c)).debug.provider).toBe("deepseek");
    expect(p.getLogs().map(l=>l.mode)).toEqual(["review","talk"]);
  });
  it("doesn't promote invented case facts into accepted dialogue",async()=>{
    const c=context();const fn=vi.fn().mockResolvedValueOnce(response(draft(c))).mockResolvedValueOnce(response({approved:false,reason:"new_case_fact"}));
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:fn});
    expect((await p.generate(c)).debug.provider).toBe("mock_fallback");
    expect(p.getLogs().at(-1)!.errorCode).toBe("new_case_fact");
  });
  it("keeps the seven fixed NPC outcomes when accepting an AI ending",async()=>{
    const state=createInitialState(), base=fallbackEnding(state);
    const fn=vi.fn().mockResolvedValueOnce(response({...base,title:"七日之后"})).mockResolvedValueOnce(response({approved:true}));
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:fn});
    const end=await p.generateEnding(state);
    expect(end.provider).toBe("deepseek");expect(end.npcOutcomes).toEqual(base.npcOutcomes);
  });
  it("rejects an ending that invents a verdict",async()=>{
    const state=createInitialState(),base=fallbackEnding(state);
    const fn=vi.fn().mockResolvedValueOnce(response({...base,narration:"藤崎律被定罪了。"})).mockResolvedValueOnce(response({approved:false}));
    const p=new CaseDialogueProvider({apiKey:"unit-test",maxAttempts:1,fetchImpl:fn});
    expect((await p.generateEnding(state)).narration).toBe(base.narration);
  });
});
