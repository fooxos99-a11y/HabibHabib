"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Trophy, Award, Calendar, Star, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { EffectSelector } from "@/components/effect-selector"
import { BadgeSelector } from "@/components/badge-selector"
import { FontSelector } from "@/components/font-selector"

interface StudentData {
  id: string
  name: string
  halaqah: string
  account_number: number
  id_number: string | null
  guardian_phone: string | null
  points: number
  rank: number | null
  created_at: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  hafiz_level: string | null
  tikrar_level: string | null
  samaa_level: string | null
  rabet_level: string | null
}

interface RankingData {
  globalRank: number
  circleRank: number
  circleSize: number
  circleName: string
  points: number
}

export default function ProfilePage() {
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  // تحديث السجلات يدويًا
  const handleRefreshRecords = () => {
    if (studentData?.id) {
      fetchAttendanceRecords(studentData.id)
    }
  }

  // تحديث تلقائي عند العودة للصفحة
  useEffect(() => {
    const handleFocus = () => {
      if (studentData?.id) fetchAttendanceRecords(studentData.id)
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [studentData?.id])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const confirmDialog = useConfirmDialog()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [themeUpdateTrigger, setThemeUpdateTrigger] = useState(0)

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole !== "student") {
      router.push("/login")
    } else {
      fetchStudentData()
    }
  }, [])

  useEffect(() => {
    const handleThemeChanged = () => {
      console.log("[v0] Theme changed event received, updating card preview")
      setThemeUpdateTrigger((prev) => prev + 1)
    }

    window.addEventListener("themeChanged", handleThemeChanged as EventListener)

    return () => {
      window.removeEventListener("themeChanged", handleThemeChanged as EventListener)
    }
  }, [])

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const tab = event.detail.tab
      if (tab) {
        setActiveTab(tab)
      }
    }

    window.addEventListener("tabChange", handleTabChange as EventListener)
    return () => {
      window.removeEventListener("tabChange", handleTabChange as EventListener)
    }
  }, [])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      console.log("[v0] Fetching student data for account:", accountNumber)

      const response = await fetch(`/api/students`)
      const data = await response.json()

      const student = data.students?.find((s: StudentData) => s.account_number === Number(accountNumber))

      if (student) {
        setStudentData(student)
        fetchRankingData(student.id)
        fetchAttendanceRecords(student.id)
      }
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
      setIsLoading(false)
    }
  }

  const fetchRankingData = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student-ranking?student_id=${studentId}`)
      const data = await response.json()

      if (data.success && data.ranking) {
        setRankingData(data.ranking)
        console.log("[v0] Ranking data fetched:", data.ranking)
      }
    } catch (error) {
      console.error("[v0] Error fetching ranking data:", error)
    }
  }

  const fetchAttendanceRecords = async (studentId: string) => {
    setIsLoadingRecords(true)
    try {
      const response = await fetch(`/api/attendance?student_id=${studentId}`)
      const data = await response.json()

      if (data.records) {
        setAttendanceRecords(data.records)
      }
    } catch (error) {
      console.error("[v0] Error fetching attendance records:", error)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "تأكيد تسجيل الخروج",
      description: "هل أنت متأكد من أنك تريد تسجيل الخروج؟",
      confirmText: "نعم، تسجيل الخروج",
      cancelText: "إلغاء",
    })

    if (confirmed) {
      setIsLoggingOut(true)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      localStorage.clear()
      router.push("/login")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  if (!studentData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-[#1a2332]">لم يتم العثور على بيانات الطالب.</div>
        </main>
        <Footer />
      </div>
    )
  }

  function getEvaluationText(level: string | null) {
    switch (level) {
      case null:
      case "not_completed":
        return "لم يكمل"
      case "excellent":
        return "ممتاز"
      case "good":
        return "جيد"
      case "average":
        return "متوسط"
      case "weak":
        return "ضعيف"
      default:
        return level
    }
  }

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-[#d8a355]/20 border-t-[#d8a355] rounded-full animate-spin" />
            <p className="text-xl font-bold text-[#d8a355]">جاري تسجيل الخروج...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />

        <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
          <div className="container mx-auto max-w-6xl">
            <div
              className="rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-8 mb-6 md:mb-8 text-white"
              style={{
                background: `linear-gradient(to right, #d8a355, #c99347)`,
              }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                <div className="flex-1 w-full">
                  <div className="flex flex-col items-center gap-4 md:gap-8">
                    <div className="flex-1 text-center md:text-right w-full">
                      <h1 className="text-2xl md:text-4xl font-bold mb-2">{studentData.name}</h1>
                      <p className="text-base md:text-xl mb-4 opacity-90">{studentData.halaqah}</p>
                      <div className="grid grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-6">
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 shadow-lg border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                          <div className="flex items-center justify-between mb-1 md:mb-2">
                            <div
                              className="p-1.5 md:p-2 rounded-lg shadow-md"
                              style={{
                                background: `linear-gradient(to bottom right, #d8a355, #c99347)`,
                              }}
                            >
                              <Trophy className="w-3 h-3 md:w-5 md:h-5 text-white" />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold text-[#1a2332]/60 tracking-wide">
                              المركز العام
                            </span>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-2xl md:text-4xl font-black"
                              style={{
                                background: `linear-gradient(to bottom right, #d8a355, #c99347)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                              }}
                            >
                              {rankingData?.globalRank || "-"}
                            </div>
                            <p className="text-[9px] md:text-xs text-[#1a2332]/50 font-semibold">بين جميع الطلاب</p>
                          </div>
                        </div>

                        <div className="bg-white/95 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 shadow-lg border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                          <div className="flex items-center justify-between mb-1 md:mb-2">
                            <div
                              className="p-1.5 md:p-2 rounded-lg shadow-md"
                              style={{
                                background: `linear-gradient(to bottom right, #d8a355, #c99347)`,
                              }}
                            >
                              <Award className="w-3 h-3 md:w-5 md:h-5 text-white" />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold text-[#1a2332]/60 tracking-wide">
                              الحلقة
                            </span>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-2xl md:text-4xl font-black"
                              style={{
                                background: `linear-gradient(to bottom right, #d8a355, #c99347)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                              }}
                            >
                              {rankingData?.circleRank || "-"}
                            </div>
                            <p className="text-[9px] md:text-xs text-[#1a2332]/50 font-semibold">
                              {rankingData?.circleName}
                            </p>
                          </div>
                        </div>

                        {/* Points Card */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 shadow-lg border-2 border-white/50 hover:scale-105 transition-transform duration-300">
                          <div className="flex items-center justify-between mb-1 md:mb-2">
                            <div
                              className="p-1.5 md:p-2 rounded-lg shadow-md"
                              style={{
                                background: `linear-gradient(to bottom right, #d8a355, #c99347)`,
                              }}
                            >
                              <Star className="w-3 h-3 md:w-5 md:h-5 text-white fill-white" />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold text-[#1a2332]/60 tracking-wide">
                              النقاط
                            </span>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-2xl md:text-4xl font-black"
                              style={{
                                background: `linear-gradient(to bottom right, #d8a355, #c99347)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                              }}
                            >
                              {studentData.points}
                            </div>
                            <p className="text-[9px] md:text-xs text-[#1a2332]/50 font-semibold">نقطة</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto bg-white shadow-lg rounded-xl p-1 md:p-2 mb-6 md:mb-8">
                <TabsTrigger
                  value="profile"
                  className="text-sm md:text-lg font-bold py-3 md:py-4 rounded-lg data-[state=active]:text-white"
                  style={{
                    background: activeTab === "profile" ? `linear-gradient(to right, #d8a355, #c99347)` : undefined,
                  }}
                >
                  <User className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                  <span className="hidden sm:inline">الملف الشخصي</span>
                  <span className="sm:hidden">الملف</span>
                </TabsTrigger>
                <TabsTrigger
                  value="achievements"
                  className="text-sm md:text-lg font-bold py-3 md:py-4 rounded-lg data-[state=active]:text-white"
                  style={{
                    background:
                      activeTab === "achievements" ? `linear-gradient(to right, #d8a355, #c99347)` : undefined,
                  }}
                >
                  <Award className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                  <span className="hidden sm:inline">الإنجازات</span>
                  <span className="sm:hidden">الإنجاز</span>
                </TabsTrigger>
                <TabsTrigger
                  value="records"
                  className="text-sm md:text-lg font-bold py-3 md:py-4 rounded-lg data-[state=active]:text-white"
                  style={{
                    background: activeTab === "records" ? `linear-gradient(to right, #d8a355, #c99347)` : undefined,
                  }}
                >
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                  <span className="hidden sm:inline">السجلات</span>
                  <span className="sm:hidden">السجل</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 md:space-y-6">
                <Card className="border-2 shadow-lg border-[#d8a355]/20">
                  <CardHeader className="bg-white p-4 md:p-6">
                    <CardTitle className="text-xl md:text-2xl text-[#1a2332]">البيانات الشخصية</CardTitle>
                    <CardDescription className="text-sm md:text-base">معلومات الطالب الأساسية</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 md:pt-6 space-y-4 md:space-y-6">
                    {/* Theme Switcher Section */}
                    <div className="pb-4 md:pb-6 border-b-2 md:border-b-2 border-[#d8a355]/20 md:border-[#d8a355]/20">
                      <ThemeSwitcher studentId={studentData?.id} />
                    </div>

                    {/* Effect Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 md:border-b-2 border-[#d8a355]/20 md:border-[#d8a355]/20">
                      <EffectSelector studentId={studentData?.id} />
                    </div>

                    {/* Badge Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 md:border-b-2 border-[#d8a355]/20 md:border-[#d8a355]/20">
                      <BadgeSelector studentId={studentData?.id} />
                    </div>

                    {/* Font Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 md:border-b-2 border-[#d8a355]/20 md:border-[#d8a355]/20">
                      <FontSelector studentId={studentData?.id} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1a2332]/70">رقم الحساب</label>
                        <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                          {studentData.account_number}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1a2332]/70">الاسم الكامل</label>
                        <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                          {studentData.name}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1a2332]/70">الحلقة</label>
                        <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                          {studentData.halaqah}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#1a2332]/70">رقم الهوية</label>
                        <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                          {studentData.id_number || "غير محدد"}
                        </div>
                      </div>
                      {studentData.guardian_phone && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-[#1a2332]/70">رقم جوال ولي الأمر</label>
                          <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                            {studentData.guardian_phone}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <Card className="border-2 shadow-lg" style={{ borderColor: `var(--theme-primary)33` }}>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Award className="w-24 h-24 mx-auto mb-4 opacity-30" style={{ color: "var(--theme-primary)" }} />
                      <p className="text-xl text-[#1a2332]/60 mb-2">لاتوجد إنجازات حاليا</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records" className="space-y-4">
                {/* تم حذف زر تحديث السجلات بناءً على طلب المستخدم */}
                <Card className="border-2 shadow-lg" style={{ borderColor: `var(--theme-primary)33` }}>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-2xl text-[#1a2332]">سجلات الحضور والتقييم</CardTitle>
                    <CardDescription className="text-base">سجلات الحضور والتقييمات الخاصة بك</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {isLoadingRecords ? (
                      <div className="text-center py-8">
                        <p className="text-lg text-[#1a2332]/60">جاري تحميل السجلات...</p>
                      </div>
                    ) : attendanceRecords.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar
                          className="w-24 h-24 mx-auto mb-4 opacity-30"
                          style={{ color: "var(--theme-primary)" }}
                        />
                        <p className="text-xl text-[#1a2332]/60 mb-2">لا توجد سجلات حضور حالياً</p>
                        <p className="text-base text-[#1a2332]/40">سيتم تسجيل حضورك وتقييماتك من قبل المعلم</p>
                      </div>
                    ) : (
                      attendanceRecords.map((record) => (
                        <div
                          key={record.id}
                          className="p-4 bg-gray-50 rounded-xl border-2"
                          style={{ borderColor: `var(--theme-primary)1A` }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <p className="text-sm font-semibold text-[#1a2332]/70">التاريخ</p>
                              <p className="text-lg font-bold text-[#1a2332]">
                                {new Date(record.date).toLocaleDateString("ar-SA")}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1a2332]/70">الحضور</p>
                              <Badge
                                className={
                                  record.status === "present"
                                    ? "bg-green-100 text-green-800 text-base"
                                    : "bg-red-100 text-red-800 text-base"
                                }
                              >
                                {record.status === "present"
                                  ? "حاضر"
                                  : record.status === "excused"
                                  ? "مستأذن"
                                  : "غائب"}
                              </Badge>
                            </div>
                            <div className="flex flex-row justify-between items-center w-full text-center gap-6">
                              <div className="flex-1 mx-6">
                                <p className="text-sm font-semibold text-[#1a2332]/70 mb-1">الحفظ</p>
                                <p className="text-base font-bold" style={{ color: "var(--theme-primary)" }}>
                                  {getEvaluationText(record.hafiz_level)}
                                </p>
                              </div>
                              <div className="flex-1 mx-6">
                                <p className="text-sm font-semibold text-[#1a2332]/70 mb-1">التكرار</p>
                                <p className="text-base font-bold" style={{ color: "var(--theme-secondary)" }}>
                                  {getEvaluationText(record.tikrar_level)}
                                </p>
                              </div>
                              <div className="flex-1 mx-6">
                                <p className="text-sm font-semibold text-[#1a2332]/70 mb-1">السماع</p>
                                <p className="text-base font-bold" style={{ color: "var(--theme-primary)" }}>
                                  {getEvaluationText(record.samaa_level)}
                                </p>
                              </div>
                              <div className="flex-1 mx-6">
                                <p className="text-sm font-semibold text-[#1a2332]/70 mb-1">الربط</p>
                                <p className="text-base font-bold" style={{ color: "var(--theme-secondary)" }}>
                                  {getEvaluationText(record.rabet_level)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
