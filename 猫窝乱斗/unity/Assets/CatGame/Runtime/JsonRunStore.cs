using System;
using System.IO;
using CatGame.Core;
using UnityEngine;
namespace CatGame.Runtime
{
    public sealed class JsonRunStore : IRunStore, IStoreDiagnostics
    {
        readonly string path;
        public string LoadNotice { get; private set; }
        public JsonRunStore(string path) { this.path=path; }
        public RunState Load()
        {
            bool damaged=false;
            foreach(var file in new[]{path,path+".bak"})
            {
                if(!File.Exists(file))continue;
                try
                {
                    var state=JsonUtility.FromJson<RunState>(File.ReadAllText(file));
                    if(state==null||state.schema!=1||string.IsNullOrEmpty(state.runId)||string.IsNullOrEmpty(state.rulesVersion)||state.boardSize<4||state.boardSize>6||state.pieces==null||state.shelf==null||state.shelf.Count!=3||state.transactions==null)throw new InvalidDataException();
                    if(damaged)
                    {
                        Quarantine();File.Copy(file,path,true);LoadNotice="存档异常，已从备份恢复";
                    }
                    return state;
                }
                catch(Exception){damaged=true;}
            }
            if(damaged){Quarantine();LoadNotice="存档无法读取，已保留原文件并开始新局";}
            return null;
        }
        void Quarantine()
        {
            if(File.Exists(path))File.Copy(path,path+".invalid-"+DateTime.UtcNow.ToString("yyyyMMddHHmmssfff"),true);
        }
        public void Save(RunState state)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string temp=path+".tmp";
            File.WriteAllText(temp,JsonUtility.ToJson(state,true));
            if(File.Exists(path))File.Replace(temp,path,path+".bak");else File.Move(temp,path);
        }
    }
    public interface IRewardedAdService { void Show(Action<bool> completed); }
    // Explicit local simulator. The UI asks complete/cancel; no network or real ad SDK.
    public sealed class SimulatedRewardedAds : IRewardedAdService
    {
        Action<bool> pending;
        public bool IsPending => pending!=null;
        public void Show(Action<bool> completed) { if(pending==null)pending=completed; }
        public void Finish(bool success) { var callback=pending;pending=null;callback?.Invoke(success); }
    }
}
