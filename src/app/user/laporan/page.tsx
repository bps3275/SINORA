"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { ClipLoader } from "react-spinners";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// Initialize SweetAlert2
const MySwal = withReactContent(Swal);

// Define interfaces for data
interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface LaporanData {
    nik: string;
    nama_mitra: string;
    nama_kegiatan: string;
    bulan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    target: number;
    honor_satuan: number;
    total_honor: number;
}

export default function LaporanPage() {
    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString();
    const currentYear = currentDate.getFullYear().toString();

    const [laporanData, setLaporanData] = useState<LaporanData[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [filterMonth, setFilterMonth] = useState<string>(""); // Default to all months
    const [filterYear, setFilterYear] = useState<string>(currentYear);
    const [availableMonths, setAvailableMonths] = useState<number[]>([parseInt(currentMonth)]);
    const [availableYears, setAvailableYears] = useState<number[]>([parseInt(currentYear)]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Modal state for export
    const [exportMonth, setExportMonth] = useState<string>("all"); // Export filter month
    const [exportYear, setExportYear] = useState<string>(currentYear); // Export filter year
    const itemsPerPage = 10;

    const router = useRouter();

    const breadcrumbItems: BreadcrumbItem[] = [{ label: "Laporan" }];

    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const response = await fetch("/api/kegiatan-dates");
                const data = await response.json();

                if (response.ok) {
                    const months = data.months.length > 0 ? data.months : [parseInt(currentMonth)];
                    const years = data.years.length > 0 ? data.years : [parseInt(currentYear)];

                    setAvailableMonths(months);
                    setAvailableYears(years);

                    setFilterMonth(""); // Default to all months
                    setFilterYear(Math.min(...years).toString());
                } else {
                    console.error("Failed to fetch available months and years:", data.error);
                }
            } catch (error) {
                console.error("Error fetching available months and years:", error);
            }
        };

        fetchAvailableDates();
    }, [currentMonth, currentYear]);

    useEffect(() => {
        const fetchLaporanData = async () => {
            setLoading(true);

            try {
                const query = new URLSearchParams({
                    filterMonth,
                    filterYear,
                    page: currentPage.toString(),
                    pageSize: itemsPerPage.toString(),
                });

                const response = await fetch(`/api/laporan-data?${query.toString()}`);
                const data = await response.json();

                if (response.ok) {
                    setLaporanData(data.laporanData);
                    setTotalCount(data.totalCount);
                } else {
                    console.error("Failed to fetch laporan data:", data.error);
                }
            } catch (error) {
                console.error("Error fetching laporan data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLaporanData();
    }, [filterMonth, filterYear, currentPage, itemsPerPage]);

    const handleExport = async () => {
        setIsModalOpen(false);

        // Show loading alert
        MySwal.fire({
            title: "Sedang mengexport laporan",
            text: "Mohon tunggu...",
            allowOutsideClick: false,
            didOpen: () => {
                MySwal.showLoading();
            },
        });

        try {
            const query = new URLSearchParams({
                filterMonth: exportMonth,
                filterYear: exportYear,
            });

            const response = await fetch(`/api/export-laporan?${query.toString()}`, {
                method: "GET",
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                // Create the dynamic file name
                const monthName = exportMonth !== "all" ? new Date(0, Number(exportMonth) - 1).toLocaleString("id-ID", { month: "long" }) : "Semua Bulan";
                const fileName = `Laporan Kegiatan Statistik_${monthName}_${exportYear}.xlsx`;

                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.click();
                window.URL.revokeObjectURL(url);

                // Show success alert
                MySwal.fire({
                    title: "Sukses",
                    text: "Laporan berhasil diexport",
                    icon: "success",
                    confirmButtonText: "OK",
                });
            } else {
                console.error("Failed to export laporan data");
                MySwal.fire({
                    title: "Gagal",
                    text: "Gagal mengexport laporan",
                    icon: "error",
                    confirmButtonText: "OK",
                });
            }
        } catch (error) {
            console.error("Error exporting data:", error);
            MySwal.fire({
                title: "Gagal",
                text: "Terjadi kesalahan saat mengexport laporan",
                icon: "error",
                confirmButtonText: "OK",
            });
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Helper function to format numbers with separators
    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("id-ID").format(value);
    };

    // Helper function to generate pagination items
    const getPaginationItems = () => {
        const items = [];
        const maxPagesToShow = 5;

        if (currentPage > maxPagesToShow) {
            items.push(
                <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`flex items-center justify-center px-3 py-2 text-sm leading-tight border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${currentPage === 1 ? "text-primary-600 bg-primary-50 border-primary-300" : ""
                        }`}
                >
                    1
                </button>
            );
            items.push(<span key="start-dots" className="px-2">...</span>);
        }

        const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`flex items-center justify-center px-3 py-2 text-sm leading-tight border border-gray-300 ${currentPage === i
                            ? "z-10 text-primary-600 bg-primary-50 border-primary-300 hover:bg-primary-100 hover:text-primary-700"
                            : "text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700"
                        }`}
                >
                    {i}
                </button>
            );
        }

        if (currentPage < totalPages - maxPagesToShow + 1) {
            items.push(<span key="end-dots" className="px-2">...</span>);
            items.push(
                <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`flex items-center justify-center px-3 py-2 text-sm leading-tight border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${currentPage === totalPages ? "text-primary-600 bg-primary-50 border-primary-300" : ""
                        }`}
                >
                    {totalPages}
                </button>
            );
        }

        return items;
    };

    return (
        <div className="w-full text-black">
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="text-2xl font-bold mt-4 text-black">Laporan Kegiatan Statistik BPS Kota Bekasi</h1>

            <div className="mt-4 mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <select
                        className="border border-gray-300 rounded px-3 py-2 focus:outline-none"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    >
                        <option value="">Semua Bulan</option> {/* Default option for all months */}
                        {availableMonths.map((month) => (
                            <option key={month} value={month.toString()}>
                                {new Date(0, month - 1).toLocaleString("id-ID", { month: "long" })}
                            </option>
                        ))}
                    </select>

                    <select
                        className="border border-gray-300 rounded px-3 py-2 focus:outline-none"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year.toString()}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)} // Open the modal
                    className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 focus:outline-none"
                >
                    <ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
                    Export Data Laporan
                </button>
            </div>

            {/* Custom Modal for Export Options */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
                        <h2 className="text-lg font-bold mb-4">Export Data Laporan</h2>
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <select
                                className="border border-gray-300 rounded px-3 py-2 focus:outline-none"
                                value={exportMonth}
                                onChange={(e) => setExportMonth(e.target.value)}
                            >
                                <option value="all">Semua Bulan</option>
                                {availableMonths.map((month) => (
                                    <option key={month} value={month.toString()}>
                                        {new Date(0, month - 1).toLocaleString("id-ID", { month: "long" })}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="border border-gray-300 rounded px-3 py-2 focus:outline-none"
                                value={exportYear}
                                onChange={(e) => setExportYear(e.target.value)}
                            >
                                {availableYears.map((year) => (
                                    <option key={year} value={year.toString()}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleExport}
                            className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 focus:outline-none w-full"
                        >
                            Export
                        </button>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="mt-4 text-red-500 hover:text-red-700 focus:outline-none w-full"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="pb-0">
                <div className="relative shadow-md sm:rounded-lg mt-4">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <Skeleton height={200} width="100%" />
                        ) : (
                            <table className="min-w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">NIK</th>
                                        <th scope="col" className="px-6 py-3">Nama Mitra</th>
                                        <th scope="col" className="px-3 py-3">Nama Kegiatan</th>
                                        <th scope="col" className="px-6 py-3">Bulan</th>
                                        <th scope="col" className="px-6 py-3">Tanggal Mulai</th>
                                        <th scope="col" className="px-6 py-3">Tanggal Selesai</th>
                                        <th scope="col" className="px-6 py-3">Target</th>
                                        <th scope="col" className="px-6 py-3">Honor Satuan</th>
                                        <th scope="col" className="px-6 py-3">Total Honor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {laporanData.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-4">Belum ada data laporan</td>
                                        </tr>
                                    ) : (
                                        laporanData.map((laporan) => (
                                            <tr key={laporan.nik} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4">{laporan.nik}</td>
                                                <td className="px-6 py-4">{laporan.nama_mitra}</td>
                                                <td className="px-6 py-4">{laporan.nama_kegiatan}</td>
                                                <td className="px-6 py-4">{laporan.bulan}</td>
                                                <td className="px-6 py-4">{laporan.tanggal_mulai}</td>
                                                <td className="px-6 py-4">{laporan.tanggal_selesai}</td>
                                                <td className="px-6 py-4">{laporan.target}</td>
                                                <td className="px-6 py-4">{formatNumber(laporan.honor_satuan)}</td>
                                                <td className="px-6 py-4">{formatNumber(laporan.total_honor)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="relative bg-white rounded-b-lg shadow-md mt-0">
                    <nav
                        className="flex flex-wrap items-center justify-between p-4 border-t border-gray-200"
                        aria-label="Table navigation"
                    >
                        <span className="text-sm font-normal text-gray-500">
                            Menampilkan <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)}</span> dari{" "}
                            <span className="font-semibold">{totalCount}</span>
                        </span>
                        <ul className="inline-flex items-center -space-x-px ml-auto">
                            <li>
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                    className={`flex items-center justify-center h-full py-1.5 px-3 text-gray-500 bg-white border border-gray-300 ${currentPage === 1 ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 hover:text-gray-700"
                                        } rounded-l-md`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </li>
                            <li className="hidden sm:flex">
                                {getPaginationItems()}
                            </li>
                            <li>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className={`flex items-center justify-center h-full py-1.5 px-3 text-gray-500 bg-white border border-gray-300 ${currentPage === totalPages ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 hover:text-gray-700"
                                        } rounded-r-md`}
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    );
}
