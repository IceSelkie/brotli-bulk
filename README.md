# Brotli Bulk

I created this utility to compress a large quantity of files into Brotli (.br) on my linux server instead of destroying my laptop's battery. If I compressed them all on a single thread on my laptop, it would have taken over 34 days. Parallelized on the server with this script, it should take about 73 hours.

### How It Works

Files will be uploaded to the `input` directory on the server, where they will be detected and queued for compression. Once compression is complete, the compressed file will be in the server's `output` directory and the input file will be gone.

The server is a NodeJS script that checks for new files to queue, dispatching the jobs to worker threads to compress as new files are added and old ones are complete. Up to `CPU_CORE_COUNT/2` compression threads will be run in parallel, allowing for that many files to be compressed at once.

The client is a Bash script that will check if there is space on the server (up to 20 files being processed/queued at once), upload files via `scp` if there is space, then check for the files to be complete, where it will download them. The completed file on the server is then removed.

### Why Brotli?

For fairly highly compressible files where the two concerns are **compression ratio** and **decompression speed**, Brotli turned out to be the best choice for me.

| Compression | Preset | Ratio | -d time | -z time | Notes |
| :--: | :--: | :--: | :--: | :--: | :--: |
| brotli (NodeJS) | nodejs | 4.031% | **_560ms_** | 686s | Best Decompress |
| brotli (Rust) | 22 | 4.037% | 570ms | 624s |  |
| brotli (Rust) | 26 | 3.445% | 570ms | 653s |  |
| xz | (-6) | 4.105% | 1330ms | **_76.4s_** | Best Compress Time |
| xz | -9 | 3.591% | 1190ms | 109s |  |
| xz | -6e | 3.680% | 1280ms | 205s |  |
| xz | -9e | **_3.140%_** | 1290ms | 315s | Best Ratio |
| xz | -9e -T0 | 3.259% | 1180ms | 109s | (--threads=6) |
|  |  |  |  |  |  |
| tar\* |  | 100.000% | 370ms | 549ms |  |
| gzip\* | -1 | 24.842% | 850ms | 4.9s |  |
| zip\* |  | 20.116% | 2810ms | 12.1s |  |
| gzip\* | (-6) | 20.116% | 720ms | 12.7s |  |
| xz\* | -0 | 15.044% | 4980ms | 22.3s |  |
| gzip\* | -9 | 19.723% | 730ms | 30.2s |  |

\* Compression schemes larger than 2x the smallest were excluded (No tested values fell between 1.31x and 4.79).
-z is compress, -d is decompress.
Presets in parentheses are defaults.
For gzip and xz, compression ranges from -0 or -1 being fastest with least compression up to -9 with highest compression (or -9e for xz for "extreme").
Times over 60s had one test run, under 60s are the average of three or five runs.

File used is a 612MB tarball (611 572 224 bytes) containing minified JSON that has a lot of repetition (hence ratios approaching 3% are possible). All compressed files are decompressed and checked with the original file via a sha256 hash.
