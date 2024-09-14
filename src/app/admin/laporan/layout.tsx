import { ReactNode } from "react";

export const metadata = {
    title: "Halaman Laporan Kegiatan - SINORA",
    description: "Halaman untuk melihat laporan kegiatan statistik di SINORA",
};

export default function LaporanKegiatanLayout({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
}
