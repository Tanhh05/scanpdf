"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FormEvent, useState } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { adminApi } from "@/services/api";

type Plan = {
  id: string;
  name: string;
  price: number;
  dailyLimit: number;
  maxFileSizeMb: number;
  storageDays: number;
  _count: { subscriptions: number };
};

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const plans = useQuery<Plan[]>({
    queryKey: ["admin-plans"],
    queryFn: async () => (await adminApi.get("/admin/plans")).data,
  });
  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, number> }) =>
      adminApi.patch(`/admin/plans/${id}`, data),
    onSuccess: () => {
      setMessage("Đã cập nhật gói dịch vụ.");
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => setMessage(axios.isAxiosError(error) ? error.response?.data?.message ?? "Cập nhật thất bại" : "Cập nhật thất bại"),
  });

  function submit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updatePlan.mutate({
      id,
      data: {
        price: Number(form.get("price")),
        dailyLimit: Number(form.get("dailyLimit")),
        maxFileSizeMb: Number(form.get("maxFileSizeMb")),
        storageDays: Number(form.get("storageDays")),
      },
    });
  }

  return (
    <section className="container-page py-14">
      <AdminNav />
      <div>
        <p className="text-sm font-bold text-indigo-600">CẤU HÌNH SAAS</p>
        <h1 className="mt-2 text-3xl font-black">Quản lý gói dịch vụ</h1>
        <p className="mt-2 text-slate-500">Thay đổi giá, lượt sử dụng và thời gian lưu file. Bảng giá công khai sẽ cập nhật theo dữ liệu này.</p>
      </div>
      {message && <p className="mt-5 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p>}
      <div className="mt-7 grid gap-5 xl:grid-cols-3">
        {plans.data?.map((plan) => (
          <form key={plan.id} onSubmit={(event) => submit(event, plan.id)} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{plan.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{plan._count.subscriptions} lượt đăng ký</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">ID cố định</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="text-sm font-bold text-slate-700">
                Giá tháng (VNĐ)
                <input name="price" type="number" min={0} defaultValue={plan.price} className="field mt-2" required />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Lượt mỗi ngày
                <input name="dailyLimit" type="number" min={1} defaultValue={plan.dailyLimit} className="field mt-2" required />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Dung lượng tối đa (MB)
                <input name="maxFileSizeMb" type="number" min={1} defaultValue={plan.maxFileSizeMb} className="field mt-2" required />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Thời gian lưu file (ngày)
                <input name="storageDays" type="number" min={1} defaultValue={plan.storageDays} className="field mt-2" required />
              </label>
            </div>
            <button disabled={updatePlan.isPending} className="btn-primary mt-6 w-full !rounded-xl !py-3">
              {updatePlan.isPending ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
