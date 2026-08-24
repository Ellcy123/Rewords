#!/bin/zsh
set -euo pipefail

base='/Users/m4/project/rewords/music-mv-experiments/小鑫_多频道求救_MV'
out="$base/final/finecut_v0.3/小鑫_多频道求救_MV_finecut_v0.3.mp4"

inputs=(
  "$base/videos/runninghub_batch05_v0.6/S01/runninghub_h3_audio_2091480190634131458.mp4"
  "$base/videos/runninghub_batch01/S02/runninghub_h3_audio_2091220408509620226.mp4"
  "$base/videos/runninghub_batch05_v0.6/S03/runninghub_h3_audio_2091480185043120130.mp4"
  "$base/videos/runninghub_batch04_v0.6/S04/runninghub_h3_audio_2091472358014672898.mp4"
  "$base/videos/runninghub_batch05_v0.6/P01/runninghub_h3_audio_2091480184309116929.mp4"
  "$base/videos/runninghub_batch05_v0.6/S06/runninghub_h3_audio_2091480186011996162.mp4"
  "$base/videos/runninghub_batch05_v0.6/S07/runninghub_h3_audio_2091480185550635009.mp4"
  "$base/videos/runninghub_batch08_v0.7_dynamic/P02A_dynamic/runninghub_h3_audio_2091505455036850177.mp4"
  "$base/videos/runninghub_batch03_v0.6/S08/runninghub_h3_audio_2091401228310507521.mp4"
  "$base/videos/runninghub_batch08_v0.7_dynamic/P02B_dynamic/runninghub_h3_audio_2091505457217896449.mp4"
  "$base/videos/runninghub_batch08_v0.7_dynamic/S10_safe/runninghub_h3_audio_2091505452675465217.mp4"
  "$base/videos/runninghub_batch09_v0.7/P03_single_lead_retry/runninghub_h3_audio_2091510124060573697.mp4"
  "$base/videos/runninghub_batch04_v0.6/S12/runninghub_h3_audio_2091472358836764674.mp4"
  "$base/videos/runninghub_batch04_v0.6/S13/runninghub_h3_audio_2091472357486186498.mp4"
)

args=()
for input in "${inputs[@]}"; do
  args+=(-i "$input")
done
args+=(-i "$base/sources/小鑫_多频道求救_音频.mp3")

# n = normal 16:9 delivery crop; p = subtle 4–7% editorial push-in.
normal='scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080'
push='scale=2050:1154:force_original_aspect_ratio=increase,crop=1920:1080'
filters=(
  "[0:v]trim=start=0:duration=5.584,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v01]"
  "[1:v]trim=start=0:duration=6.874,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v02]"
  "[2:v]trim=start=0:duration=3.703,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v03]"
  "[3:v]trim=start=0:duration=4.040,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v04]"
  "[4:v]trim=start=0:duration=4.470,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v05]"
  "[5:v]trim=start=0:duration=6.711,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v06]"
  "[6:v]trim=start=0:duration=1.552,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v07]"
  "[7:v]trim=start=1.250:duration=2.000,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v08]"
  "[8:v]trim=start=0:duration=4.470,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v09]"
  "[9:v]trim=start=0.750:duration=1.324,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v10]"
  "[9:v]trim=start=2.100:duration=1.347,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v11]"
  "[9:v]trim=start=4.250:duration=1.776,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v12]"
  "[10:v]trim=start=0:duration=0.700,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v13]"
  "[10:v]trim=start=0.700:duration=1.100,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v14]"
  "[10:v]trim=start=1.800:duration=2.205,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v15]"
  "[11:v]trim=start=0.500:duration=1.777,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v16]"
  "[11:v]trim=start=2.500:duration=1.788,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v17]"
  "[11:v]trim=start=4.500:duration=1.776,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v18]"
  "[11:v]trim=start=6.500:duration=1.500,setpts=PTS-STARTPTS,${push},fps=24,format=yuv420p[v19]"
  "[12:v]trim=start=3.636:duration=2.947,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v20]"
  "[13:v]trim=start=0:duration=5.477,setpts=PTS-STARTPTS,${normal},fps=24,format=yuv420p[v21]"
  "[v01][v02][v03][v04][v05][v06][v07][v08][v09][v10][v11][v12][v13][v14][v15][v16][v17][v18][v19][v20][v21]concat=n=21:v=1:a=0[v]"
)

ffmpeg -y -hide_banner \
  "${args[@]}" \
  -filter_complex "${(j:;:)filters}" \
  -map '[v]' -map '14:a:0' \
  -c:v libx264 -preset medium -crf 17 -movflags +faststart \
  -c:a aac -b:a 320k -shortest \
  "$out"
