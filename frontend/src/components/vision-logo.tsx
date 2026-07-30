import Image from "next/image";
import { cn } from "@/lib/utils";

type VisionLogoProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

/** Shared Vision mark — white V + cattle on veld green (`/logo.png`). */
export function VisionLogo({ className, size = 40, priority = false }: VisionLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Vision"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-xl object-cover", className)}
    />
  );
}
