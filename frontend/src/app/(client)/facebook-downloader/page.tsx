import type { Metadata } from "next";
import { MediaDownloader } from "@/components/client/media-downloader";

export const metadata: Metadata = {
  title: "Facebook Downloader - Tải Reels và video công khai",
  description: "Tải Facebook Reels, video công khai và lựa chọn chất lượng HD từ URL công khai.",
};

export default function FacebookDownloaderPage() {
  return (
    <MediaDownloader
      config={{
        id: "facebook",
        title: "Facebook Downloader",
        description: "Tải Facebook Reels và video công khai nhanh chóng. Chọn link video phù hợp và ưu tiên chất lượng HD khi nguồn hỗ trợ.",
        placeholder: "https://www.facebook.com/reel/1234567890",
        features: ["Facebook Reels", "Video công khai", "HD download"],
      }}
    />
  );
}
