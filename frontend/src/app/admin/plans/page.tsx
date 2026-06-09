"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FormEvent, useState } from "react";
import { BriefcaseBusiness, CirclePlus, Info, Medal, PackagePlus, Star, Trash2, X } from "lucide-react";
import { AdminPageHeader, AdminPagination, adminInputClass, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type Plan = {
  id: string;
  name: string;
  price: number;
  dailyLimit: number;
  maxFileSizeMb: number;
  storageDays: number;
  _count: { subscriptions: number; payments: number };
};

type PlanPayload = {
  name: string;
  price: number;
  dailyLimit: number;
  maxFileSizeMb: number;
  storageDays: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? fallback : fallback;
}

function NumberField({
  name,
  label,
  defaultValue,
  min = 1,
}: {
  name: keyof Omit<PlanPayload, "name">;
  label: string;
  defaultValue: number;
  min?: number;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input name={name} type="number" min={min} defaultValue={defaultValue} className={`${adminInputClass} mt-2`} required />
    </label>
  );
}

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(1);
  const plans = useQuery<Plan[]>({
    queryKey: ["admin-plans"],
    queryFn: async () => (await adminApi.get("/admin/plans")).data,
  });

  function refreshPlans() {
    queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    queryClient.invalidateQueries({ queryKey: ["admin-plans-options"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  }

  const createPlan = useMutation({
    mutationFn: async (data: PlanPayload) => adminApi.post("/admin/plans", data),
    onSuccess: () => {
      setMessage("Đã tạo gói dịch vụ mới.");
      setShowCreateForm(false);
      refreshPlans();
    },
    onError: (error) => setMessage(getErrorMessage(error, "Tạo gói dịch vụ thất bại")),
  });
  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<PlanPayload, "name"> }) =>
      adminApi.patch(`/admin/plans/${id}`, data),
    onSuccess: () => {
      setMessage("Đã cập nhật gói dịch vụ.");
      refreshPlans();
    },
    onError: (error) => setMessage(getErrorMessage(error, "Cập nhật thất bại")),
  });
  const deletePlan = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/plans/${id}`),
    onSuccess: () => {
      setMessage("Đã xóa gói dịch vụ.");
      refreshPlans();
    },
    onError: (error) => setMessage(getErrorMessage(error, "Xóa gói dịch vụ thất bại")),
  });

  function readPlanForm(form: HTMLFormElement): PlanPayload {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? "").trim(),
      price: Number(data.get("price")),
      dailyLimit: Number(data.get("dailyLimit")),
      maxFileSizeMb: Number(data.get("maxFileSizeMb")),
      storageDays: Number(data.get("storageDays")),
    };
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    createPlan.mutate(readPlanForm(event.currentTarget));
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setMessage("");
    const { name: _name, ...data } = readPlanForm(event.currentTarget);
    updatePlan.mutate({ id, data });
  }

  function confirmDelete(plan: Plan) {
    const hasHistory = plan._count.subscriptions > 0 || plan._count.payments > 0;
    if (hasHistory || plan.name.toLowerCase() === "free") return;
    if (window.confirm(`Xóa gói "${plan.name}"? Thao tác này không thể hoàn tác.`)) {
      setMessage("");
      deletePlan.mutate(plan.id);
    }
  }
  const planLimit = 5;
  const planPages = Math.max(1, Math.ceil((plans.data?.length ?? 0) / planLimit));
  const visiblePlans = plans.data?.slice((page - 1) * planLimit, page * planLimit) ?? [];

  return (
    <section>
      <AdminPageHeader
        description="Tùy chỉnh các thông số kỹ thuật và giá cả cho từng gói dịch vụ. Các thay đổi có hiệu lực ngay lập tức."
        action={
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setShowCreateForm((value) => !value);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0b4dcc] px-4 text-sm font-semibold text-white shadow-md"
          >
            {showCreateForm ? <X size={19} /> : <CirclePlus size={19} />}
            {showCreateForm ? "Đóng biểu mẫu" : "Thêm gói dịch vụ"}
          </button>
        }
      />

      {message && <p className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#242c42] px-6 py-4 text-sm font-semibold text-white shadow-2xl">{message}</p>}

      {showCreateForm && (
        <form onSubmit={submitCreate} className={`${adminPanelClass} mt-5 border-[#b8c9f5] bg-[#f1f4ff] p-5`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b4dcc] text-white">
              <PackagePlus size={21} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">Tạo gói dịch vụ mới</h2>
              <p className="text-sm text-slate-500">Gói mới sẽ xuất hiện ngay trên bảng giá công khai.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm font-bold text-slate-700">
              Tên gói
              <input name="name" minLength={2} maxLength={50} className="field mt-2" placeholder="Ví dụ: Premium" required />
            </label>
            <NumberField name="price" label="Giá tháng (VNĐ)" defaultValue={0} min={0} />
            <NumberField name="dailyLimit" label="Lượt mỗi ngày" defaultValue={100} />
            <NumberField name="maxFileSizeMb" label="Dung lượng tối đa (MB)" defaultValue={100} />
            <NumberField name="storageDays" label="Lưu file (ngày)" defaultValue={7} />
          </div>
          <div className="mt-4 flex justify-end">
            <button disabled={createPlan.isPending} className="h-10 rounded-lg bg-[#0b4dcc] px-5 text-sm font-semibold text-white disabled:opacity-50">
              {createPlan.isPending ? "Đang tạo..." : "Tạo gói dịch vụ"}
            </button>
          </div>
        </form>
      )}

      {plans.isLoading && <div className="mt-7 h-48 animate-pulse rounded-2xl bg-slate-100" />}
      {plans.isError && <p className="mt-7 rounded-xl bg-red-50 p-4 font-bold text-red-700">Không thể tải danh sách gói dịch vụ.</p>}

      <div className="mt-7 grid items-stretch gap-5 xl:grid-cols-3">
        {visiblePlans.map((plan, index) => {
          const isFree = plan.name.toLowerCase() === "free";
          const isPopular = plan.name.toLowerCase() === "pro";
          const hasHistory = plan._count.subscriptions > 0 || plan._count.payments > 0;
          const cannotDelete = isFree || hasHistory;
          const deleteReason = isFree
            ? "Gói Free là gói mặc định nên không thể xóa."
            : hasHistory
              ? "Gói đã có đăng ký hoặc thanh toán nên không thể xóa."
              : "Xóa gói dịch vụ";

          return (
            <form
              key={plan.id}
              onSubmit={(event) => submitUpdate(event, plan.id)}
              className={`relative flex min-h-[540px] flex-col rounded-xl border bg-white p-6 shadow-[0_2px_6px_rgba(30,41,59,0.035)] ${isPopular ? "border-2 border-[#bdd0fb]" : "border-[#d8dceb]"}`}
            >
              <input type="hidden" name="name" value={plan.name} />
              {isPopular && <span className="absolute right-6 top-0 rounded-b-lg bg-[#0b4dcc] px-4 py-1.5 text-xs font-semibold text-white">PHỔ BIẾN</span>}
              <div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${isPopular ? "bg-[#dce7ff] text-[#0b4dcc]" : "bg-[#e8edff] text-slate-600"}`}>
                  {index === 0 ? <Medal size={23} /> : index === 1 ? <Star size={23} /> : <BriefcaseBusiness size={23} />}
                </span>
                <div>
                  <h2 className={`mt-4 text-[23px] font-semibold ${isPopular ? "text-[#0b4dcc]" : "text-[#111527]"}`}>{plan.name}</h2>
                  <p className="mt-1 text-sm text-[#586075]">{isFree ? "Dành cho cá nhân trải nghiệm" : isPopular ? "Dành cho chuyên gia" : "Dành cho tổ chức, doanh nghiệp"}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <NumberField name="price" label="Giá tháng (VNĐ)" defaultValue={plan.price} min={0} />
                <NumberField name="dailyLimit" label="Lượt mỗi ngày" defaultValue={plan.dailyLimit} />
                <NumberField name="maxFileSizeMb" label="Dung lượng tối đa (MB)" defaultValue={plan.maxFileSizeMb} />
                <NumberField name="storageDays" label="Thời gian lưu file (ngày)" defaultValue={plan.storageDays} />
              </div>
              <div className="mt-auto pt-6">
              <button disabled={updatePlan.isPending} className={`h-11 w-full rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${isPopular ? "bg-[#0b4dcc]" : index === 0 ? "bg-slate-500" : "bg-[#252d43]"}`}>
                {updatePlan.isPending ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
              <button
                type="button"
                disabled={cannotDelete || deletePlan.isPending}
                title={deleteReason}
                onClick={() => confirmDelete(plan)}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <Trash2 size={17} />
                {deletePlan.isPending ? "Đang xóa..." : "Xóa gói"}
              </button>
              {cannotDelete && <p className="mt-2 text-center text-xs text-slate-400">{deleteReason}</p>}
              </div>
            </form>
          );
        })}
      </div>
      {planPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
          <span>{plans.data?.length ?? 0} gói dịch vụ</span>
          <AdminPagination page={page} pages={planPages} onPageChange={setPage} />
        </div>
      )}

      <div className={`${adminPanelClass} mt-7 flex gap-3 bg-[#f2f4ff] p-5`}>
        <Info className="mt-0.5 shrink-0 text-[#0b4dcc]" size={23} />
        <div>
          <h3 className="font-semibold">Lưu ý quản trị</h3>
          <p className="mt-2 text-sm leading-6 text-[#4f586e]">
            Mọi thay đổi đối với các gói dịch vụ được ghi lại trong nhật ký hệ thống. Gói Free là gói mặc định và không thể xóa; các gói đã có đăng ký hoặc thanh toán cũng được bảo vệ để giữ toàn vẹn dữ liệu.
          </p>
        </div>
      </div>
    </section>
  );
}
