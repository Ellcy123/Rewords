using UnityEngine;
namespace CatDemo {
public class FirstLevelView:MonoBehaviour {
 public FirstLevel State=new FirstLevel(); Font font; GUIStyle text,title,button; bool ready,paused; int dragging=-1; Vector2 pointer,offset; double flashUntil; int shownAttacks;
 const float Cell=100; readonly Vector2 origin=new Vector2(70,410);
 void Awake(){Application.targetFrameRate=60;Screen.orientation=ScreenOrientation.Portrait; font=Font.CreateDynamicFontFromOSFont(new[]{"Arial Unicode MS","PingFang SC","Heiti SC","Arial"},24);}
 void OnApplicationPause(bool p){paused=p;}
 void Update(){if(!paused)State.Tick(UnityEngine.Time.deltaTime);if(State.Attacks!=shownAttacks){shownAttacks=State.Attacks;flashUntil=UnityEngine.Time.unscaledTimeAsDouble+.3;}}
 void Box(Rect r,Color c){var prev=GUI.color;GUI.color=c;GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=prev;}
 void Label(Rect r,string s,bool big=false){GUI.Label(r,s,big?title:text);}
 bool Btn(Rect r,string s){return GUI.Button(r,s,button);}
 Vector2 ScreenPoint(Vector2 p,float scale,Vector2 margin)=>(p-margin)/scale;
 void OnGUI(){
 if(!ready){text=new GUIStyle(GUI.skin.label){font=font,fontSize=19,alignment=TextAnchor.MiddleCenter,wordWrap=true};text.normal.textColor=new Color(.9f,.89f,.83f);title=new GUIStyle(text){fontSize=30,fontStyle=FontStyle.Bold};button=new GUIStyle(GUI.skin.button){font=font,fontSize=19};ready=true;}
 float scale=Mathf.Min(Screen.width/540f,Screen.height/960f);Vector2 margin=new Vector2((Screen.width-540*scale)/2,(Screen.height-960*scale)/2);var ev=Event.current;pointer=ScreenPoint(ev.mousePosition,scale,margin);GUI.matrix=Matrix4x4.TRS(margin,Quaternion.identity,new Vector3(scale,scale,1));
 Box(new Rect(0,0,540,960),new Color(.07f,.085f,.12f));Label(new Rect(30,15,480,45),"猫窝乱斗 · 第一次守梦",true);Label(new Rect(30,65,480,30),"第 1 关 / 床底的手                 金币 "+State.Gold);
 bool flash=Time.unscaledTimeAsDouble<flashUntil;Box(new Rect(190+(flash?5:0),130,160,110),new Color(.24f,.20f,.32f));for(int i=0;i<5;i++)Box(new Rect(184+i*35,105-i%2*20,20,65),new Color(.24f,.20f,.32f));Label(new Rect(190,140,160,60),"•       •",true);Label(new Rect(120,242,300,28),"梦魇  "+State.EnemyHP+" / 32");Box(new Rect(100,278,340,8),Color.gray);Box(new Rect(100,278,340*State.EnemyHP/32f,8),new Color(.75f,.4f,.55f));
 Label(new Rect(30,300,480,44),State.Last);Label(new Rect(30,346,480,30),$"生命 {State.HP}/40     攻击间隔 {State.Interval:0.##}秒     {(State.Fighting?$"{25-State.Time:0.0}秒":"准备阶段不限时")}");
 for(int y=0;y<4;y++)for(int x=0;x<4;x++)Box(new Rect(origin.x+x*Cell,origin.y+y*Cell,Cell-4,Cell-4),new Color(.15f,.18f,.23f));
 DrawPiece(true,origin+new Vector2(State.CatX,State.CatY)*Cell,dragging==0?.3f:1);
 if(State.Bought&&State.ToyX>=0)DrawPiece(false,origin+new Vector2(State.ToyX,State.ToyY)*Cell,dragging==1?.3f:1);
 if(State.Connected)Label(new Rect(70,377,400,28),"已连接 · 攻速 +60% ✓");
 bool input=!State.Fighting&&!State.Finished;
 if(input){if(Btn(new Rect(70,817,125,38),"旋转猫"))State.TransformCat(false);if(Btn(new Rect(204,817,125,38),"换姿势"))State.TransformCat(true);if(Btn(new Rect(338,817,132,38),"旋转玩具"))State.RotateToy();
 if(!State.Bought){if(Btn(new Rect(70,866,240,64),"逗猫棒 · 3 金币\n点击购买"))State.Buy();}
 else if(State.ToyX<0){Box(new Rect(70,862,220,75),new Color(.22f,.24f,.28f));Label(new Rect(75,867,210,60),"逗猫棒 → 拖入格子");}
 else Label(new Rect(65,867,240,62),"逗猫棒已购\n拖动可调整位置");
 if(Btn(new Rect(335,866,135,64),"开始战斗")){dragging=-1;State.Start();}
 }
 if(State.Fighting){if(Btn(new Rect(70,866,180,56),paused?"继续":"暂停"))paused=!paused;Label(new Rect(270,866,200,56),"普攻进度 "+State.Attacks%3+" / 3");}
 if(State.Finished){Label(new Rect(60,813,420,44),State.Won?"第一关完成 · 奖励已到账":"本次未通过",true);if(Btn(new Rect(125,868,290,60),State.Won?"重新体验第一关":"回去调整")){if(State.Won)State=new FirstLevel();else State.Retry();paused=false;dragging=-1;}}
 if(input){if(ev.type==EventType.MouseDown&&ev.button==0){for(int k=0;k<2;k++){if(k==1&&!State.Bought)continue;Vector2 pos=k==0?origin+new Vector2(State.CatX,State.CatY)*Cell:origin+new Vector2(State.ToyX,State.ToyY)*Cell;if(k==1&&State.ToyX<0){if(new Rect(70,862,220,75).Contains(pointer)){dragging=1;offset=new Vector2(45,35);ev.Use();break;}}else foreach(var c in State.Cells(k==0)){if(new Rect(pos+(Vector2)c*Cell,Vector2.one*(Cell-4)).Contains(pointer)){dragging=k;offset=pointer-pos;ev.Use();break;}}if(dragging>=0)break;}}
 if(dragging>=0){Vector2 at=pointer-offset;int x=Mathf.RoundToInt((at.x-origin.x)/Cell),y=Mathf.RoundToInt((at.y-origin.y)/Cell);bool valid=State.Valid(dragging==0,x,y);foreach(var c in State.Cells(dragging==0))Box(new Rect(origin+new Vector2(x+c.x,y+c.y)*Cell,Vector2.one*(Cell-4)),valid?new Color(.25f,.55f,.4f):new Color(.65f,.25f,.3f));DrawPiece(dragging==0,at,.8f);if(ev.type==EventType.MouseUp){if(!State.Place(dragging==0,x,y))State.Last="位置无效，已放回原处";else State.Last=State.Connected?"连上了！面条出爪更快了":"贴着猫摆放才能生效";dragging=-1;ev.Use();}}}
 GUI.matrix=Matrix4x4.identity;
 }
 void DrawPiece(bool cat,Vector2 p,float alpha){Color color=cat?new Color(.86f,.65f,.36f,alpha):new Color(.42f,.72f,.64f,alpha);foreach(var c in State.Cells(cat)){Box(new Rect(p+(Vector2)c*Cell+Vector2.one*5,Vector2.one*(Cell-14)),color);}Label(new Rect(p.x,p.y,95,90),cat?"面条\n= ω =":"逗猫棒");}
}
}
