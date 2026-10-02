using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace CatGame.Presentation
{
    // The art catalog is generated from 美术/动效/build_index.json by export_unity.py.
    // Image.sprite swapping keeps animation in the existing Canvas presentation layer.
    [Serializable] public sealed class SpriteSequenceCatalog { public SpriteSequenceEntry[] entries; }
    [Serializable] public sealed class SpriteSequenceEntry
    {
        public string id;
        public int[] idleMs, attackMs, attackOrder, motionMs, crop;
        public string source, reviewState;
    }

    public sealed class SpriteSequence
    {
        public Sprite[] frames;
        public int[] durationsMs;
        public bool loop;
    }

    public static class SpriteSequenceLibrary
    {
        static SpriteSequenceCatalog catalog;
        static readonly Dictionary<string, SpriteSequence> cache = new Dictionary<string, SpriteSequence>();

        public static SpriteSequence Get(string id, string action)
        {
            string key = id + ":" + action;
            if (cache.TryGetValue(key, out var cached)) return cached;
            if (catalog == null)
            {
                var file = Resources.Load<TextAsset>("Art/Animation/catalog");
                if (file == null) return null;
                catalog = JsonUtility.FromJson<SpriteSequenceCatalog>(file.text);
            }
            var entry = Array.Find(catalog.entries, item => item.id == id);
            if (entry == null) return null;
            int[] order, timing;
            switch (action)
            {
                case "idle": order = new[] { 1, 2, 3 }; timing = entry.idleMs; break;
                case "attack": order = entry.attackOrder; timing = entry.attackMs; break;
                case "motion": order = new[] { 1, 2, 3, 4, 5, 6 }; timing = entry.motionMs; break;
                default: return null;
            }
            if (order == null || timing == null || order.Length == 0 || order.Length != timing.Length) return null;
            var frames = new Sprite[order.Length];
            for (int i = 0; i < order.Length; i++)
            {
                frames[i] = Resources.Load<Sprite>("Art/Animation/" + id + "/frame_" + order[i].ToString("00"));
                if (frames[i] == null) return null;
            }
            var clip = new SpriteSequence { frames = frames, durationsMs = timing, loop = action == "idle" };
            cache[key] = clip;
            return clip;
        }
    }

    public sealed class SpriteSequencePlayer
    {
        readonly Image image;
        readonly Sprite fallback;
        readonly Queue<SpriteSequence> pending = new Queue<SpriteSequence>();
        SpriteSequence idle, active;
        int frameIndex;
        float remaining;
        public SpriteSequencePlayer(Image image)
        {
            this.image = image;
            fallback = image.sprite;
        }
        public void SetIdle(SpriteSequence clip)
        {
            idle = clip;
            if (active == null) Start(clip);
        }
        public void Play(SpriteSequence clip)
        {
            if (clip == null) return;
            if (active == null || active == idle) Start(clip);
            else if (pending.Count < 6) pending.Enqueue(clip);
        }
        void Start(SpriteSequence clip)
        {
            active = clip;
            frameIndex = 0;
            if (clip == null)
            {
                image.sprite = fallback;
                image.enabled = fallback != null;
                return;
            }
            image.enabled = true;
            image.sprite = clip.frames[0];
            remaining = Mathf.Max(0.01f, clip.durationsMs[0] / 1000f);
        }
        public void Tick(float deltaTime)
        {
            if (active == null || deltaTime <= 0) return;
            remaining -= deltaTime;
            while (remaining <= 0 && active != null)
            {
                frameIndex++;
                if (frameIndex >= active.frames.Length)
                {
                    if (active.loop) frameIndex = 0;
                    else if (pending.Count > 0) { Start(pending.Dequeue()); continue; }
                    else { Start(idle); continue; }
                }
                image.sprite = active.frames[frameIndex];
                remaining += Mathf.Max(0.01f, active.durationsMs[frameIndex] / 1000f);
            }
        }
    }
}
