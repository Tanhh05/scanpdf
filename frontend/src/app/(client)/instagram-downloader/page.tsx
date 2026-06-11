import type { Metadata } from "next";
import { MediaDownloader } from "@/components/client/media-downloader";

export const metadata: Metadata = {
  title: "Instagram Downloader - Tải Reels, Story, Post ảnh",
  description: "Tải Instagram Reels, Story, post ảnh và carousel từ URL công khai.",
};

export default function InstagramDownloaderPage() {
  return (
    <MediaDownloader
      config={{
        id: "instagram",
        title: "Instagram Downloader",
        description: "Tải Reels, Story, post ảnh và carousel Instagram. Với carousel, hệ thống sẽ trả từng ảnh hoặc slide để tải riêng.",
        placeholder: "https://www.instagram.com/reel/abc123/",
        features: ["Instagram Reels", "Story", "Post ảnh", "Carousel"],
      }}
    />
  );
}
