"use client";

import { useEffect, useState } from "react";
import { api } from "../../app/client";
import type { User } from "../../app/types";
import "./staff-permissions.css";

type Policy = {
  capabilities: Record<string, boolean>;
  salesReadDays: number; salesWriteDays: number;
  expenseReadDays: number; expenseWriteDays: number;
  version: number;
};
type Locale = "en" | "ar";
const groups = [
  ["Walk-in sales", "مبيعات العملاء", [
    ["sales.view", "View sales and collections", "عرض المبيعات والتحصيل"],
    ["sales.create", "Take orders", "إنشاء الطلبات"],
    ["sales.update", "Update orders and payments", "تعديل الطلبات والمدفوعات"],
    ["sales.cancel", "Cancel orders", "إلغاء الطلبات"],
    ["sales.print", "Print invoices", "طباعة الفواتير"],
    ["sales.export", "Export reports", "تصدير التقارير"],
  ]],
  ["Expenses", "المصروفات", [
    ["expenses.view", "View expenses", "عرض المصروفات"],
    ["expenses.create", "Add expenses", "إضافة المصروفات"],
    ["expenses.update", "Edit expenses", "تعديل المصروفات"],
    ["expenses.delete", "Delete expenses", "حذف المصروفات"],
  ]],
  ["Hotel billing", "فواتير الفنادق", [
    ["hotels.view", "View hotel deliveries and invoices", "عرض تسليمات وفواتير الفنادق"],
    ["hotels.create", "Add hotel deliveries", "إضافة تسليمات الفنادق"],
    ["hotels.update", "Edit hotel deliveries and payments", "تعديل تسليمات ومدفوعات الفنادق"],
    ["hotels.cancel", "Cancel hotel deliveries", "إلغاء تسليمات الفنادق"],
    ["hotels.invoice", "Issue monthly hotel invoices", "إصدار فواتير الفنادق الشهرية"],
    ["hotels.print", "Print hotel invoices", "طباعة فواتير الفنادق"],
  ]],
  ["Business day", "يوم العمل", [
    ["day.view", "View opening and closing totals", "عرض إجماليات الفتح والإغلاق"],
    ["day.open", "Open the shop day", "فتح يوم العمل"],
    ["day.close", "Close and count the drawer", "إغلاق وحساب الصندوق"],
  ]],
] as const;

export function StaffPermissions({ users, locale = "en" }: { users: User[]; locale?: Locale }) {
  const staff = users.filter((user) => user.role === "staff");
  const [selected, setSelected] = useState(staff[0]?.id ?? 0);
  const selectedStaff = staff.find((user) => user.id === selected) ?? staff[0];
  const t = (en: string, ar: string) => locale === "ar" ? ar : en;
  return <section className="card staff-permissions">
    <header className="section-heading"><div><h3>{t("Individual staff permissions", "صلاحيات كل موظف")}</h3><p className="muted">{t("Choose a staff member. Changes apply to this account only and take effect on the next request.", "اختر موظفاً. تسري التغييرات على هذا الحساب فقط وتُطبق عند الطلب التالي.")}</p></div></header>
    <label className="staff-permission-select">{t("Staff member", "الموظف")}<select value={selectedStaff?.id ?? ""} onChange={(event) => setSelected(Number(event.target.value))}>{staff.map((user) => <option key={user.id} value={user.id}>{user.displayName} · {user.username}{!user.isActive ? t(" (inactive)", " (غير نشط)") : ""}</option>)}</select></label>
    {selectedStaff ? <PermissionEditor key={selectedStaff.id} userId={selectedStaff.id} name={selectedStaff.displayName} locale={locale} /> : <p>{t("Create a staff account first.", "أنشئ حساب موظف أولاً.")}</p>}
  </section>;
}

function PermissionEditor({ userId, name, locale }: { userId: number; name: string; locale: Locale }) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [savedPolicy, setSavedPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const t = (en: string, ar: string) => locale === "ar" ? ar : en;
  useEffect(() => {
    const controller = new AbortController();
    api<{ policy: Policy }>(`/api/staff-access?userId=${userId}`, { signal: controller.signal }).then((result) => {
      setPolicy(result.policy); setSavedPolicy(result.policy); setError("");
    }).catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load permissions."); });
    return () => controller.abort();
  }, [userId, reload]);
  const dirty = JSON.stringify(policy) !== JSON.stringify(savedPolicy);
  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await api<{ policy: Policy }>("/api/staff-access", { method: "PATCH", body: JSON.stringify({ userId, policy }) });
      setPolicy(result.policy); setSavedPolicy(result.policy);
      setMessage(t(`Permissions saved for ${name}.`, `تم حفظ صلاحيات ${name}.`));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save permissions."); }
    finally { setSaving(false); }
  }
  return <div aria-busy={saving}>
    {error && <div role="alert" className="alert error">{error} <button type="button" className="text-button" onClick={() => { setPolicy(null); setMessage(""); setReload((value) => value + 1); }}>{t("Reload permissions", "إعادة تحميل الصلاحيات")}</button></div>}
    {message && <div role="status" className="alert success">{message}</div>}
    {!policy ? <div className="staff-permission-loading" role="status">{t("Loading staff permissions…", "جاري تحميل صلاحيات الموظف…")}<div className="skeleton" /><div className="skeleton" /></div> : <>
      <div className="staff-permission-groups">{groups.map(([label, labelAr, operations]) => <fieldset key={label} disabled={saving}><legend>{t(label, labelAr)}</legend>{operations.map(([key, en, ar]) => <label key={key} className="staff-permission-toggle"><span>{t(en, ar)}</span><input type="checkbox" role="switch" checked={Boolean(policy.capabilities[key])} onChange={(event) => { const checked = event.target.checked; setMessage(""); setPolicy((current) => current && ({ ...current, capabilities: { ...current.capabilities, [key]: checked } })); }} /></label>)}</fieldset>)}</div>
      <fieldset className="staff-history-window" disabled={saving}><legend>{t("History access (including today)", "الوصول للسجل (بما في ذلك اليوم)")}</legend><p className="muted">{t("1 day means today only. 7 days means today and the previous 6 days. Older edits still need a specific approval. An operation switched off cannot be restored by a historical approval.", "يوم واحد يعني اليوم فقط. 7 أيام تشمل اليوم والأيام الستة السابقة. التعديلات الأقدم تحتاج موافقة محددة. الموافقة التاريخية لا تتجاوز إيقاف العملية.")}</p><div className="staff-history-fields">{([
        ["salesReadDays", "View sales / hotels", "عرض المبيعات والفنادق"],
        ["salesWriteDays", "Edit sales / hotels", "تعديل المبيعات والفنادق"],
        ["expenseReadDays", "View expenses", "عرض المصروفات"],
        ["expenseWriteDays", "Edit expenses", "تعديل المصروفات"],
      ] as const).map(([field, en, ar]) => <label key={field}>{t(en, ar)}<input type="number" min={1} max={365} step={1} value={policy[field]} onChange={(event) => { const value = Number(event.target.value); setPolicy((current) => current && ({ ...current, [field]: value })); setMessage(""); }} /></label>)}</div></fieldset>
      <p className="muted">{t("Owner-only controls such as users, shop settings, catalog prices, and access management remain protected. Turning off viewing does not delete existing records.", "تبقى إدارة المستخدمين وإعدادات المتجر وأسعار القائمة والصلاحيات محمية للمالك فقط. إيقاف العرض لا يحذف السجلات الموجودة.")}</p>
      <div className="staff-permission-actions"><button type="button" disabled={!dirty || saving} className="secondary-button" onClick={() => { setPolicy(savedPolicy); setMessage(""); setError(""); }}>{t("Discard changes", "تجاهل التغييرات")}</button><button type="button" disabled={!dirty || saving} className="primary-button" onClick={() => void save()}>{saving ? t("Saving…", "جاري الحفظ…") : t("Save permissions", "حفظ الصلاحيات")}</button></div>
    </>}
  </div>;
}
