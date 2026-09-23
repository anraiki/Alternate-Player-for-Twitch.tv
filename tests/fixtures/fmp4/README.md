Synthetic blue video and a generated sine tone, created locally with FFmpeg:

```sh
ffmpeg -f lavfi -i color=c=blue:s=64x64:r=10 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 -t 2 \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -g 10 \
  -c:a aac -b:a 16k -f hls -hls_time 1 -hls_segment_type fmp4 \
  -hls_segment_filename segment%d.m4s stream.m3u8
```

These fixtures contain no Twitch data or credentials.
