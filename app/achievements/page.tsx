
"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Award, Trophy, Medal, Verified, Trash2 } from 'lucide-react'
import { useEffect, useState } from "react"

// مكون حوار التأكيد المخصص
function ConfirmDialog({ open, onConfirm, onCancel, message }: { open: boolean, onConfirm: () => void, onCancel: () => void, message: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs text-center relative">
        <div className="text-lg font-bold mb-4 text-[#1a2332]">تأكيد الحذف</div>
        <div className="mb-6 text-[#1a2332]/80">{message}</div>
        <div className="flex gap-2 justify-center">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300">إلغاء</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-500 text-white font-bold hover:bg-red-600">حذف</button>
        </div>
      </div>
    </div>
  )
}
function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState({
    icon_type: "trophy",
    title: "",
    date: "",
    student_name: "",
    description: "",
    category: ""
  })
  // متغيرات حوار التأكيد
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, id: string | null }>({ open: false, id: null })
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    setUserRole(typeof window !== 'undefined' ? localStorage.getItem("userRole") : null)
    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/achievements")
        const data = await response.json()
        setAchievements(data.achievements || [])
      } catch (error) {
        console.error("[v0] Error fetching achievements:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAchievements()
  }, [])

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case "trophy":
        return Trophy
      case "award":
        return Award
      case "medal":
        return Medal
      case "certificate":
        return Verified
      default:
        return Trophy
    }
  }

  // حذف الإنجاز مع حوار تأكيد مخصص
  const handleDeleteAchievement = (id: string) => {
    setConfirmDialog({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.id) return;
    try {
      const res = await fetch(`/api/achievements?id=${confirmDialog.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        // جلب القائمة من السيرفر بعد الحذف
        const refreshed = await fetch("/api/achievements");
        const refreshedData = await refreshed.json();
        setAchievements(refreshedData.achievements || []);
      } else {
        alert(data.error || "حدث خطأ أثناء حذف الإنجاز");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم");
    }
    setConfirmDialog({ open: false, id: null })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />
      {/* حوار التأكيد المخصص */}
      <ConfirmDialog
        open={confirmDialog.open}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null })}
        message="هل أنت متأكد أنك تريد حذف هذا الإنجاز؟"
      />

      {/* زر إضافة إنجاز جديد - يظهر فقط للإداري */}
      {userRole === "admin" && (
        <div className="container mx-auto max-w-6xl flex justify-end mt-6">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-[#023232] font-bold shadow hover:from-[#C9A961] hover:to-[#BFA050]"
            onClick={() => setIsDialogOpen(true)}
          >
            <Award className="w-5 h-5" />
            إضافة إنجاز جديد
          </button>
        </div>
      )}

      {/* نافذة إضافة إنجاز */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute left-4 top-4 text-gray-500" onClick={() => setIsDialogOpen(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-[#1a2332]">إضافة إنجاز جديد</h2>
            <form
              onSubmit={async e => {
                e.preventDefault();
                try {
                  const res = await fetch("/api/achievements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form)
                  });
                  const data = await res.json();
                  if (data.success && data.achievement) {
                    setAchievements(prev => [data.achievement, ...prev]);
                  } else {
                    alert(data.error || "حدث خطأ أثناء إضافة الإنجاز");
                  }
                } catch (err) {
                  alert("حدث خطأ في الاتصال بالخادم");
                }
                setIsDialogOpen(false);
                setForm({ icon_type: "trophy", title: "", date: "", student_name: "", description: "", category: "" });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block mb-1 font-semibold">الأيقونة</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={form.icon_type}
                  onChange={e => setForm(f => ({ ...f, icon_type: e.target.value }))}
                >
                  <option value="trophy">🏆 كأس</option>
                  <option value="award">🎖️ ميدالية</option>
                  <option value="certificate">📜 شهادة</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-semibold">العنوان</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">اسم الطالب</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={form.student_name}
                  onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">الوصف</label>
                <textarea
                  className="w-full border rounded px-2 py-1"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">التاريخ</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">التصنيف</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2 rounded bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-[#023232] font-bold hover:from-[#C9A961] hover:to-[#BFA050]"
              >إضافة</button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 py-8 md:py-16 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-16">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-[#D4AF37] to-[#C9A961] rounded-full mb-4 md:mb-6">
              <Trophy className="w-7 h-7 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332] mb-2 md:mb-4 text-balance px-2">إنجازات الطلاب المتميزة</h1>
            <p className="text-base md:text-xl text-[#1a2332]/70 px-2">نفخر بإنجازات طلابنا في حلقات القرآن الكريم</p>
          </div>

          {achievements.length === 0 ? (
            <div className="text-center py-16 text-xl text-[#1a2332]/60">لا توجد إنجازات حالياً</div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {achievements.map((achievement) => {
                const IconComponent = getIconComponent(achievement.icon_type)
                return (
                  <div
                    key={achievement.id}
                    className="group relative bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-[#D4AF37]/20 hover:border-[#D4AF37]/40"
                  >
                    {/* زر الحذف في الزاوية العلوية اليمنى - فقط للإداري */}
                    {userRole === "admin" && (
                      <button
                        onClick={() => handleDeleteAchievement(achievement.id)}
                        className="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full p-2 shadow transition-all z-10"
                        title="حذف الإنجاز"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-64 h-48 md:h-auto flex-shrink-0 bg-gradient-to-br from-[#D4AF37]/10 to-[#C9A961]/10 relative overflow-hidden">
                        {achievement.image_url ? (
                          <img
                            src={achievement.image_url || "/placeholder.svg"}
                            alt={achievement.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-[#D4AF37] to-[#C9A961] rounded-full">
                              <IconComponent className="w-8 h-8 md:w-12 md:h-12 text-white" />
                            </div>
                          </div>
                        )}
                        {/* Top gradient bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 md:h-2 bg-gradient-to-r from-[#D4AF37] to-[#C9A961]" />
                      </div>

                      <div className="flex-1 p-4 md:p-6">
                        {/* Category badge */}
                        <div className="inline-block bg-[#D4AF37]/10 px-2 md:px-3 py-1 rounded-full mb-2 md:mb-3">
                          <span className="text-xs md:text-sm font-semibold text-[#D4AF37]">{achievement.category}</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-lg md:text-2xl font-bold text-[#1a2332] mb-1 md:mb-2 text-balance">{achievement.title}</h2>

                        {/* Student name */}
                        <p className="text-base md:text-lg font-semibold text-[#D4AF37] mb-2 md:mb-3">{achievement.student_name}</p>

                        {/* Description */}
                        <p className="text-sm md:text-base text-[#1a2332]/70 leading-relaxed mb-2 md:mb-4">{achievement.description}</p>

                        {/* Date */}
                        <p className="text-xs md:text-sm text-[#1a2332]/60">{achievement.date}</p>
                      </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute bottom-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-tl from-[#D4AF37]/5 to-transparent rounded-tl-full" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default AchievementsPage
