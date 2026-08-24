#!/bin/zsh
set -euo pipefail

base='/Users/m4/project/rewords/music-mv-experiments/小鑫_多频道求救_MV'
out="${OUT_OVERRIDE:-$base/final/roughcut_v0.1/小鑫_多频道求救_MV_roughcut_v0.1.mp4}"

inputs=(
  "$base/videos/runninghub_batch05_v0.6/S01/runninghub_h3_audio_2091480190634131458.mp4"
  "$base/videos/runninghub_batch01/S02/runninghub_h3_audio_2091220408509620226.mp4"
  "$base/videos/runninghub_batch05_v0.6/S03/runninghub_h3_audio_2091480185043120130.mp4"
  "$base/videos/runninghub_batch04_v0.6/S04/runninghub_h3_audio_2091472358014672898.mp4"
  "$base/videos/runninghub_batch05_v0.6/P01/runninghub_h3_audio_2091480184309116929.mp4"
  "$base/videos/runninghub_batch05_v0.6/S06/runninghub_h3_audio_2091480186011996162.mp4"
  "$base/videos/runninghub_batch05_v0.6/S07/runninghub_h3_audio_2091480185550635009.mp4"
  "${P02A_VIDEO_OVERRIDE:-$base/videos/runninghub_batch06_v0.6/P02A/runninghub_h3_audio_2091487430871052289.mp4}"
  "$base/videos/runninghub_batch03_v0.6/S08/runninghub_h3_audio_2091401228310507521.mp4"
  "${P02B_VIDEO_OVERRIDE:-$base/videos/runninghub_batch06_v0.6/P02B_final/runninghub_h3_audio_2091490400455061506.mp4}"
  "${S10_VIDEO_OVERRIDE:-$base/videos/runninghub_batch06_v0.6/S10/runninghub_h3_audio_2091487426966151170.mp4}"
  "${P03_VIDEO_OVERRIDE:-$base/videos/runninghub_batch06_v0.6/P03/runninghub_h3_audio_2091487433375043585.mp4}"
  "$base/videos/runninghub_batch04_v0.6/S12/runninghub_h3_audio_2091472358836764674.mp4"
  "$base/videos/runninghub_batch04_v0.6/S13/runninghub_h3_audio_2091472357486186498.mp4"
)
durations=(5.584 6.874 3.703 4.040 4.470 6.711 1.552 2.000 4.470 4.447 4.005 6.841 2.947 5.477)
starts=(0 0 0 0 0 0 0 0 0 0 0 0 3.636 0)

args=()
for input in "${inputs[@]}"; do
  args+=(-i "$input")
done
args+=(-i "$base/sources/小鑫_多频道求救_音频.mp3")

filters=()
labels=()
for index in {1..14}; do
  input_index=$((index - 1))
  start="${starts[$index]}"
  duration="${durations[$index]}"
  label="v${index}"
  filters+=("[${input_index}:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p[${label}]")
  labels+=("[${label}]")
done
filters+=("${labels[*]}concat=n=14:v=1:a=0[v]")

ffmpeg -y -hide_banner \
  "${args[@]}" \
  -filter_complex "${(j:;:)filters}" \
  -map '[v]' -map '14:a:0' \
  -c:v libx264 -preset medium -crf 17 -movflags +faststart \
  -c:a aac -b:a 320k -shortest \
  "$out"
