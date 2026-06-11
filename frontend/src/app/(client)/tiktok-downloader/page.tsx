import type { Metadata } from "next";
import { MediaDownloader } from "@/components/client/media-downloader";

export const metadata: Metadata = {
  title: "TikTok Downloader - Tải video TikTok không watermark",
  description: "Dán URL TikTok để tải video không watermark, MP3, ảnh và slideshow nhanh chóng.",
};

export default function TikTokDownloaderPage() {
  return (
    <MediaDownloader
      config={{
        id: "tiktok",
        title: "TikTok Downloader",
        description: "Tải video TikTok không watermark, trích xuất MP3, tải ảnh TikTok và slideshow chỉ bằng một URL công khai.",
        placeholder: "https://www.tiktok.com/@account/video/1234567890",
        features: ["No watermark", "Ảnh TikTok", "Slideshow TikTok", "MP3 TikTok"],
      }}
    />
  );
}
