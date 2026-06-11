import type { Metadata } from "next";
import { MediaDownloader } from "@/components/client/media-downloader";

export const metadata: Metadata = {
  title: "YouTube Downloader - Tải MP4 và MP3",
  description: "Tải video YouTube dạng MP4 và trích xuất MP3 từ URL công khai.",
};

export default function YoutubeDownloaderPage() {
  return (
    <MediaDownloader
      config={{
        id: "youtube",
        title: "YouTube Downloader",
        description: "Tải video YouTube với nhiều mức chất lượng MP4 và tạo file MP3 từ video công khai chỉ bằng một lần dán URL.",
        placeholder: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        features: ["MP4 720p", "MP4 1080p", "MP3"],
      }}
    />
  );
}
