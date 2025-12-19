"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, RotateCcw } from "lucide-react"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"

type EvaluationLevel = "excellent" | "very_good" | "good" | "not_completed" | null

interface EvaluationOption {
  hafiz?: EvaluationLevel
  tikrar?: EvaluationLevel
  samaa?: EvaluationLevel
  rabet?: EvaluationLevel
}

interface StudentAttendance {
  id: number
  name: string
  halaqah: string
  attendance: "present" | "absent" | "excused" | null
  evaluation?: EvaluationOption
}

export default function HalaqahManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const params = useParams()

  const [teacherData, setTeacherData] = useState<any>(null)
  const [students, setStudents] = useState<StudentAttendance[]>([])
  const [hasCircle, setHasCircle] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle")
  const showAlert = useAlertDialog()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    const accountNumber = localStorage.getItem("accountNumber")

    if (!loggedIn || userRole !== "teacher") {
      router.push("/login")
    } else {
      fetchTeacherData(accountNumber || "")
    }
  }, [router])

  const fetchTeacherData = async (accountNumber: string) => {
    try {
      console.log("[v0] Fetching teacher data for account:", accountNumber)
      const response = await fetch(`/api/teachers?account_number=${accountNumber}`)
      const data = await response.json()

      if (data.teachers && data.teachers.length > 0) {
        const teacher = data.teachers[0]
        setTeacherData(teacher)
        console.log("[v0] Teacher data:", teacher)

        // Check if teacher has a circle
        if (teacher.halaqah) {
          setHasCircle(true)
          fetchStudents(teacher.halaqah)
        } else {
          setHasCircle(false)
          setIsLoading(false)
        }
      } else {
        setHasCircle(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error("[v0] Error fetching teacher data:", error)
      setHasCircle(false)
      setIsLoading(false)
    }
  }

  const fetchStudents = async (halaqah: string) => {
    try {
      console.log("[v0] Fetching students for halaqah:", halaqah)
      const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
      const data = await response.json()

      if (data.students) {
        const mappedStudents: StudentAttendance[] = data.students.map((student: any) => ({
          id: student.id,
          name: student.name,
          halaqah: student.circle_name || halaqah,
          attendance: null,
          evaluation: {},
        }))
        setStudents(mappedStudents)
        console.log("[v0] Students loaded:", mappedStudents)
      }
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error fetching students:", error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasCircle || !teacherData?.halaqah) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <h1 className="text-3xl font-bold text-[#1a2332]">لا يوجد لديك حلقة</h1>
              <p className="text-lg text-[#1a2332]/70">الرجاء التواصل مع الإدارة لتعيين حلقة لك</p>
              <Button onClick={() => router.push("/teacher/dashboard")} className="mt-4">
                <ArrowRight className="w-5 h-5 ml-2" />
                العودة إلى لوحة التحكم
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const toggleAttendance = (id: number, status: "present" | "absent" | "excused") => {
    setStudents(
      students.map((s) => {
        if (s.id !== id) return s;
        if (status === "absent" || status === "excused") {
          return { ...s, attendance: status, evaluation: {} };
        }
        // إذا كانت التقييمات فارغة عند التحويل إلى حاضر، هيئها بقيم not_completed
        const defaultEval = {
          hafiz: "not_completed",
          tikrar: "not_completed",
          samaa: "not_completed",
          rabet: "not_completed",
        };
        return {
          ...s,
          attendance: status,
          evaluation: Object.keys(s.evaluation || {}).length > 0 ? s.evaluation : defaultEval,
        };
      }),
    );
  }

// التعديل: لا تصفر التقييمات عند اختيار حاضر، فقط عند اختيار غائب أو مستأذن
// الكود المعدل:
//  const toggleAttendance = (id: number, status: "present" | "absent" | "excused") => {
//    setStudents(
//      students.map((s) =>
//        s.id === id
//          ? {
//              ...s,
//              attendance: status,
//              evaluation: (status === "absent" || status === "excused") ? {} : (s.evaluation || {}),
//            }
//          : s,
//      ),
//    )
//  }

  const setEvaluation = (studentId: number, type: "hafiz" | "tikrar" | "samaa" | "rabet", level: EvaluationLevel) => {
    setStudents(
      students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              evaluation: { ...s.evaluation, [type]: level },
            }
          : s,
      ),
    )
  }

  const setAllEvaluations = (studentId: number, level: EvaluationLevel) => {
    setStudents(
      students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              evaluation: {
                hafiz: level,
                tikrar: level,
                samaa: level,
                rabet: level,
              },
            }
          : s,
      ),
    )
  }

  const handleReset = () => {
    setStudents(students.map((s) => ({ ...s, attendance: null, evaluation: {} })))
  }

  const handleSave = async () => {
    const allPresentsEvaluated = students
      .filter((s) => s.attendance === "present")
      .every((s) => s.evaluation?.hafiz && s.evaluation?.tikrar && s.evaluation?.samaa && s.evaluation?.rabet)

    if (!allPresentsEvaluated) {
      await showAlert("لم يتم تقييم جميع الطلاب الحاضرين! تأكد من تقييم جميع الطلاب قبل الحفظ", "تحذير")
      return
    }

    setIsSaving(true)
    setSaveStatus("saving")
    try {
      const studentsToSave = students.filter((s) => s.attendance !== null)
      await fetch("/api/attendance/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: studentsToSave,
          teacher_id: teacherData.id,
          halaqah: teacherData.halaqah,
        }),
      })
      setSaveStatus("success")
      await showAlert("تم حفظ البيانات بنجاح!", "نجاح")
      // إعادة جلب الطلاب بعد الحفظ تلقائيًا
      if (teacherData?.halaqah) {
        await fetchStudents(teacherData.halaqah)
      }
      setTimeout(() => {
        handleReset()
        setSaveStatus("idle")
        setIsSaving(false)
      }, 100)
    } catch (error) {
      console.error("[v0] Error saving data:", error)
      setSaveStatus("idle")
      setIsSaving(false)
      await showAlert("حدث خطأ أثناء حفظ البيانات", "خطأ")
    }
  }

  const markAllPresent = () => {
    setStudents(students.map((s) => ({ ...s, attendance: "present", evaluation: s.evaluation || {} })))
  }

  const markAllAbsent = () => {
    setStudents(students.map((s) => ({ ...s, attendance: "absent", evaluation: {} })))
  }

  const markAllExcused = () => {
    setStudents(students.map((s) => ({ ...s, attendance: "excused", evaluation: {} })))
  }

  const halaqahName = teacherData?.halaqah || "الحلقة"

  const EvaluationOption = ({
    studentId,
    type,
    label,
    notCompletedText,
  }: {
    studentId: number
    type: "hafiz" | "tikrar" | "samaa" | "rabet"
    label: string
    notCompletedText: string
  }) => {
    const student = students.find((s) => s.id === studentId)
    const currentLevel = student?.evaluation?.[type] || null

    return (
      <div className="space-y-2">
        <div className="font-semibold text-[#1a2332] text-center">{label}</div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setEvaluation(studentId, type, "excellent")}
            className={`text-xs py-2 transition-all ${
              currentLevel === "excellent"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-2 border-[#D4AF37]"
                : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
            }`}
          >
            ممتاز
          </Button>
          <Button
            onClick={() => setEvaluation(studentId, type, "very_good")}
            className={`text-xs py-2 transition-all ${
              currentLevel === "very_good"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-2 border-[#D4AF37]"
                : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
            }`}
          >
            جيد جداً
          </Button>
          <Button
            onClick={() => setEvaluation(studentId, type, "good")}
            className={`text-xs py-2 transition-all ${
              currentLevel === "good"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-2 border-[#D4AF37]"
                : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
            }`}
          >
            جيد
          </Button>
          <Button
            onClick={() => setEvaluation(studentId, type, "not_completed")}
            className={`text-xs py-2 transition-all ${
              currentLevel === "not_completed"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-2 border-[#D4AF37]"
                : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
            }`}
          >
            لم يكمل
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <h1 className="text-4xl font-bold text-[#1a2332]">{halaqahName}</h1>
              <div className="flex gap-3">
                <Button
                  onClick={markAllPresent}
                  className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] font-bold py-3 px-6 transition-all"
                >
                  حاضر للكل
                </Button>
                <Button
                  onClick={markAllAbsent}
                  className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] font-bold py-3 px-6 transition-all"
                >
                  غياب للكل
                </Button>
                <Button
                  onClick={markAllExcused}
                  className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] font-bold py-3 px-6 transition-all"
                >
                  مستأذن للكل
                </Button>
              </div>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <p className="text-2xl font-bold text-[#1a2332]">لا يوجد طلاب في هذه الحلقة</p>
              <p className="text-lg text-[#1a2332]/70">يمكنك إضافة طلاب من لوحة التحكم</p>
            </div>
          ) : (
            <>
              {/* Student List */}
              <div className="space-y-4">
                {students.map((student) => (
                  <Card key={student.id} className="border-2 border-[#35A4C7]/20 shadow-lg">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xl font-bold text-[#1a2332]">{student.name}</p>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                onClick={() => toggleAttendance(student.id, "present")}
                                className={`flex-1 py-6 text-base font-bold transition-all ${
                                  student.attendance === "present"
                                    ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-[#023232] border-2 border-[#D4AF37]"
                                    : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
                                }`}
                              >
                                حاضر
                              </Button>
                              <Button
                                onClick={() => toggleAttendance(student.id, "absent")}
                                className={`flex-1 py-6 text-base font-bold transition-all ${
                                  student.attendance === "absent"
                                    ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-[#023232] border-2 border-[#D4AF37]"
                                    : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
                                }`}
                              >
                                غائب
                              </Button>
                              <Button
                                onClick={() => toggleAttendance(student.id, "excused")}
                                className={`flex-1 py-6 text-base font-bold transition-all ${
                                  student.attendance === "excused"
                                    ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-[#023232] border-2 border-[#D4AF37]"
                                    : "bg-white text-[#1a2332] border-2 border-[#D4AF37] hover:bg-[#f5f1e8]"
                                }`}
                              >
                                مستأذن
                              </Button>
                            </div>
                            {student.attendance === "present" && (
                              <div className="space-y-2 pt-2">
                                <p className="text-sm font-semibold text-[#1a2332] text-center">تقييم الكل:</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    onClick={() => setAllEvaluations(student.id, "excellent")}
                                    className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] text-xs py-2 transition-all"
                                  >
                                    ممتاز
                                  </Button>
                                  <Button
                                    onClick={() => setAllEvaluations(student.id, "very_good")}
                                    className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] text-xs py-2 transition-all"
                                  >
                                    جيد جداً
                                  </Button>
                                  <Button
                                    onClick={() => setAllEvaluations(student.id, "good")}
                                    className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] text-xs py-2 transition-all"
                                  >
                                    جيد
                                  </Button>
                                  <Button
                                    onClick={() => setAllEvaluations(student.id, "not_completed")}
                                    className="bg-white border-2 border-[#D4AF37] text-[#1a2332] hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#C9A961] hover:text-[#023232] text-xs py-2 transition-all"
                                  >
                                    لم يكمل
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Evaluation Options */}
                        {student.attendance === "present" && (
                          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <EvaluationOption
                              studentId={student.id}
                              type="hafiz"
                              label="الحفظ"
                              notCompletedText="لم يحفظ"
                            />
                            <EvaluationOption
                              studentId={student.id}
                              type="tikrar"
                              label="التكرار"
                              notCompletedText="لم يكرر"
                            />
                            <EvaluationOption
                              studentId={student.id}
                              type="samaa"
                              label="السماع"
                              notCompletedText="لم يسمع"
                            />
                            <EvaluationOption
                              studentId={student.id}
                              type="rabet"
                              label="الربط"
                              notCompletedText="لم يربط"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-bold py-6 px-10 text-lg bg-transparent w-[200px]"
                  disabled={isSaving}
                >
                  <RotateCcw className="w-5 h-5 ml-2" />
                  إعادة تعيين
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-white font-bold py-6 px-10 text-lg w-[200px]"
                  disabled={isSaving}
                >
                  {saveStatus === "saving" && "جاري الحفظ..."}
                  {saveStatus === "success" && "تم الحفظ!"}
                  {saveStatus === "idle" && "حفظ"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
