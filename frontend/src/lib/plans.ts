export type PlanFeature = {
  id: string;
  planId: string;
  featureKey: string;
  featureValue: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  dailyLimit: number;
  maxFileSizeMb: number;
  storageDays: number;
  features?: PlanFeature[];
};

const planOrder: Record<string, number> = {
  Free: 0,
  Pro: 1,
  Business: 2,
};

export function sortPlans(plans: Plan[]) {
  return [...plans].sort((left, right) => {
    const leftOrder = planOrder[left.name] ?? 99;
    const rightOrder = planOrder[right.name] ?? 99;
    return leftOrder - rightOrder || left.price - right.price || left.name.localeCompare(right.name);
  });
}

export function formatPlanPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

export function planDescription(plan: Plan) {
  if (plan.price === 0) return "Dành cho cá nhân bắt đầu sử dụng ScanPDF.";
  return `${plan.dailyLimit.toLocaleString("vi-VN")} lượt mỗi ngày, tối đa ${plan.maxFileSizeMb}MB/file.`;
}

export function planFeatures(plan: Plan) {
  const dbFeatures = (plan.features ?? [])
    .map((feature) => feature.featureValue.trim())
    .filter(Boolean);

  return [
    `${plan.dailyLimit.toLocaleString("vi-VN")} lượt mỗi ngày`,
    `Tối đa ${plan.maxFileSizeMb.toLocaleString("vi-VN")}MB mỗi file`,
    `Lưu file trong ${plan.storageDays.toLocaleString("vi-VN")} ngày`,
    ...dbFeatures,
  ];
}

export function isFreePlan(plan: Plan) {
  return plan.price === 0 || plan.name.toLowerCase() === "free";
}

export function isRecommendedPlan(plan: Plan) {
  return plan.name.toLowerCase() === "pro";
}
