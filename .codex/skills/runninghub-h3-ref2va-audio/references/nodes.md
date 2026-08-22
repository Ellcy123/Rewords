# Published node fields
AI application: `2087127180013817858`. Run `python scripts/runninghub_h3_ref2va_audio.py nodes` for the current schema.

## Common mappings

| Purpose | Node field |
|---|---|
| Images 1–3 | `34.image`, `35.image`, `36.image` |
| Audio references 1–2 | `84.audio`, `85.audio` |
| Duration | `37.value` |
| User prompt | `39.value` |
| Full-reference optimizer instructions | `68.value` |
| Stage 1 aspect / megapixels | `89.aspect_ratio`, `89.megapixels` |
| Stage 2 aspect / megapixels | `138.aspect_ratio`, `138.megapixels` |
| Stage 1 seed | `18.noise_seed` |
| Stage 2 seed | `121.noise_seed` |
| Reference sizing | `46.ref_image_size` |

Always change both aspect-ratio nodes together. Keep node 117 unsaved and node 122 saved unless debugging the intermediate pass.

## All 35 public fields

| Node | Class | Field | Type | Publisher default |
|---:|---|---|---|---|
| 9 | VAELoader | `vae_name` | LIST | `minimax_h3_video_vae_fp16.safetensors` |
| 10 | VAELoader | `vae_name` | LIST | `minimax_h3_audio_vae_fp32.safetensors` |
| 17 | CLIPLoader | `clip_name` | LIST | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` |
| 18 | RandomNoise | `noise_seed` | INT | publisher seed |
| 20 | BasicScheduler | `denoise` | FLOAT | `1` |
| 20 | BasicScheduler | `scheduler` | LIST | `simple` |
| 20 | BasicScheduler | `steps` | INT | `8` |
| 34 | LoadImage | `image` | IMAGE | publisher image |
| 35 | LoadImage | `image` | IMAGE | publisher image |
| 36 | LoadImage | `image` | IMAGE | publisher image |
| 37 | PrimitiveFloat | `value` | FLOAT | `10` |
| 39 | PrimitiveStringMultiline | `value` | STRING | publisher example prompt |
| 46 | MiniMaxH3ReferenceToVideo | `ref_image_size` | LIST | `match` |
| 68 | PrimitiveStringMultiline | `value` | STRING | long full-reference optimizer prompt |
| 69 | UNETLoader | `unet_name` | UNET | `minimax_h3_ref2va_int8_convrot.safetensors` |
| 69 | UNETLoader | `weight_dtype` | LIST | `default` |
| 70 | CLIPLoader | `clip_name` | LIST | `qwen3vl_32b_minimax_h3_int8_convrot.safetensors` |
| 83 | UNETLoader | `unet_name` | UNET | `minimax_h3_ref2va_pruned_fp8_scaled.safetensors` |
| 83 | UNETLoader | `weight_dtype` | LIST | `default` |
| 84 | LoadAudio | `audio` | AUDIO | publisher FLAC |
| 85 | LoadAudio | `audio` | AUDIO | publisher FLAC |
| 89 | ResolutionSelector | `aspect_ratio` | LIST | `16:9 (Widescreen)` |
| 89 | ResolutionSelector | `megapixels` | FLOAT | `0.4` |
| 108 | LoraLoaderModelOnly | `lora_name` | LORA | H3 Turbo T8 LoRA |
| 108 | LoraLoaderModelOnly | `strength_model` | FLOAT | `1` |
| 109 | VAELoader | `vae_name` | LIST | `minimax_h3_video_vae_int8_convrot.safetensors` |
| 117 | VHS_VideoCombine | `save_output` | BOOLEAN | `false` |
| 121 | RandomNoise | `noise_seed` | INT | `123456789` |
| 122 | VHS_VideoCombine | `save_output` | BOOLEAN | `true` |
| 128 | BasicScheduler | `denoise` | FLOAT | `0.2` |
| 128 | BasicScheduler | `scheduler` | LIST | `beta` |
| 128 | BasicScheduler | `steps` | INT | `4` |
| 134 | ImageResizeKJv2 | `crop_position` | LIST | `center` |
| 138 | ResolutionSelector | `aspect_ratio` | LIST | `16:9 (Widescreen)` |
| 138 | ResolutionSelector | `megapixels` | FLOAT | `1.5` |

## Stage structure

Stage 1 uses node 20 for the main 8-step sample at low resolution. Stage 2 uses node 128 for a 4-step, low-denoise refinement at the larger node 138 resolution. Node 122 is the only publisher-enabled saved video output.
