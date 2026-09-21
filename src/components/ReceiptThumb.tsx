import { useEffect, useState } from "react";
import { getReceiptBlob } from "../lib/db";

interface Props {
  receiptId: string;
}

/** Loads a stored receipt lazily — the list never holds every image at once. */
export function ReceiptThumb({ receiptId }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void getReceiptBlob(receiptId).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receiptId]);

  if (!url) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-sunken" />;
  }

  return (
    <img
      src={url}
      alt="ใบเสร็จ"
      className="max-h-64 w-full rounded-xl object-contain"
    />
  );
}
