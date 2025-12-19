"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createBrowserClient } from "@supabase/ssr"
import { Lock, Zap, Trophy, BookOpen, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface PathwayLevel {
  id: number
  title: string
  description: string
  week: number
  isLocked: boolean
  isCompleted: boolean
  points: number
  userPoints: number
}


// جلب المستويات من قاعدة البيانات
async function fetchLevels(supabase: any) {
  const { data, error } = await supabase
    .from('pathway_levels')
    .select('*')
    .order('level_number', { ascending: true });
  if (error) throw error;
  return data;
}

export default function PathwaysPage() {
  const [levels, setLevels] = useState<PathwayLevel[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()


  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const role = localStorage.getItem("userRole")
    setUserRole(role)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    fetchLevels(supabase).then((levelsFromDb) => {
      if (loggedIn && role === "student") {
        loadPathwayData(levelsFromDb)
      } else {
        setLevels(levelsFromDb.map((l:any) => ({
          id: l.level_number,
          title: l.title,
          description: l.description,
          week: l.level_number,
          isLocked: false,
          isCompleted: false,
          points: 100,
          userPoints: 0,
        })))
        setIsLoading(false)
      }
    })
  }, [])


  const loadPathwayData = async (levelsFromDb: any[]) => {
    try {
      const currentUserStr = localStorage.getItem("currentUser")
      if (!currentUserStr) {
        router.push("/login")
        return
      }
      const currentUser = JSON.parse(currentUserStr)
      const studentId = localStorage.getItem("studentId") || currentUser.id || currentUser.account_number;
      const levelsToUse = levelsFromDb
      // Load unlocked levels from localStorage
      const unlockedLevelsStr = localStorage.getItem("unlockedLevels")
      const unlockedLevels = unlockedLevelsStr ? JSON.parse(unlockedLevelsStr) : [1]

      // جلب حالة الإكمال من Supabase
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      // جلب جميع المستويات المكتملة لهذا الطالب مع النقاط
      const { data: completions, error: completionsError } = await supabase
        .from('pathway_level_completions')
        .select('level_number, points')
        .eq('student_id', studentId);

      const completedMap: Record<number, number> = {};
      if (completions) {
        completions.forEach((c: any) => {
          completedMap[c.level_number] = c.points;
        });
      }

      const processedLevels = levelsToUse.map((level: any) => {
        const isCompleted = completedMap.hasOwnProperty(level.level_number);
        return {
          ...level,
          isLocked: level.is_locked === true,
          isCompleted,
          userPoints: isCompleted ? completedMap[level.level_number] : level.points,
        }
      });

      setLevels(processedLevels)
      // جمع مجموع النقاط المكتسبة من pathway_level_completions فقط
      const total = processedLevels.reduce((acc, level) => acc + (level.isCompleted ? (level.userPoints || 0) : 0), 0)
      setTotalPoints(total)
    } catch (error) {
      console.error("Error loading pathway data:", error)
      setLevels(
        levelsFromDb.map((level:any) => ({
          ...level,
          isLocked: level.id !== 1,
          isCompleted: false,
          userPoints: 0,
        })),
      )
      setTotalPoints(0)
    }
    setIsLoading(false)
  }

  const completedLevels = levels.filter((level) => level.isCompleted).length
  const progressPercentage = levels.length > 0 ? (completedLevels / levels.length) * 100 : 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  // إذا كان المستخدم إداري أو غير طالب، اجعل جميع المستويات مفتوحة
  if (userRole !== "student") {
      const openLevels = levels.map((level) => ({
        ...level,
        isLocked: false,
        isCompleted: false,
        userPoints: 0,
      }))
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8 md:mb-12">
              <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />
                <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المسار (عرض إداري)</h1>
              </div>
              <p className="text-base md:text-lg text-gray-600">جميع المستويات مفتوحة للإداري</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {openLevels.map((level) => (
                <div
                  key={level.id}
                  className={`relative rounded-xl overflow-hidden transition-all duration-300 shadow-sm border border-[#d8a355]/30 bg-white hover:shadow-lg`}
                  style={{ minHeight: '210px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px' }}
                >
                  <div className={`flex flex-col justify-between h-full`} style={{ flex: 1 }}>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-[#d8a355]" />
                        <span className="font-bold text-[#1a2332]">{level.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{level.description}</p>
                      <p className="text-xs text-gray-400">الأسبوع {level.week}</p>
                    </div>
                    <Button
                      className="w-full mt-4 bg-[#d8a355] hover:bg-[#c99245] text-[#00312e] font-bold"
                      onClick={() => router.push(`/pathways/level/${level.id}`)}
                    >
                      دخول المستوى
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />
              <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المسار</h1>
            </div>
            <p className="text-base md:text-lg text-gray-600">تقدم عبر 10 مستويات تعليمية وحقق الإنجازات</p>
            <div className="mt-3 md:mt-4 max-w-2xl mx-auto">
              <p className="text-xs md:text-sm text-[#1a2332] bg-[#faf9f6] border border-[#d8a355] rounded-lg p-2 md:p-3">
                في حال تم إنجاز المستوى في أسبوع بعد الأسبوع المحدد، سيتم خصم نصف النقاط عند احتسابه
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-r from-[#00312e] to-[#023232] rounded-xl md:rounded-2xl p-6 md:p-8 mb-8 md:mb-12 text-white shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Progress Bar - now first */}
              <div className="flex flex-col justify-center md:col-span-2">
                <p className="text-xs md:text-sm opacity-75 mb-2 text-right">التقدم العام</p>
                <Progress value={progressPercentage} className="h-2 md:h-3 [&>div]:origin-right" />
                <p className="text-xs md:text-sm opacity-75 mt-2 text-right">{Math.round(progressPercentage)}% مكتمل</p>
              </div>

              {/* Total Points - now second */}
              <div className="flex flex-col items-center justify-center">
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-[#d8a355] mb-2" />
                <div className="text-3xl md:text-4xl font-bold text-[#d8a355]">{totalPoints}</div>
                <p className="text-base md:text-lg opacity-90">إجمالي النقاط</p>
              </div>
            </div>
          </div>

          {/* Levels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {levels.map((level) => (
              <div
                key={level.id}
                className={`relative rounded-xl overflow-hidden transition-all duration-300 shadow-sm border border-[#d8a355]/30 bg-white ${
                  level.isCompleted
                    ? "opacity-40 cursor-not-allowed"
                    : level.isLocked
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:shadow-lg"
                }`}
                style={{ minHeight: '210px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px' }}
              >
                {/* Level Card Background */}
                <div
                  className={`flex flex-col justify-between h-full`}
                  style={{ flex: 1 }}
                >
                  {/* Header */}
                  <div>
                    {level.isCompleted && (
                      <div className="flex items-center justify-center mb-2 md:mb-3">
                        <div className="bg-[#d8a355] rounded-full p-1.5 md:p-2">
                          <Check className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                      </div>
                    )}

                    {level.isLocked && (
                      <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
                        <Lock className="w-4 h-4 md:w-6 md:h-6 text-gray-500" />
                      </div>
                    )}

                    <div
                      className={`text-3xl md:text-5xl font-bold mb-1 md:mb-2 ${level.isCompleted ? "text-[#d8a355]" : "text-[#d8a355]"}`}
                    >
                      {level.id}
                    </div>

                    {!level.isLocked && (
                      <h3
                        className={`text-sm md:text-lg font-bold mb-1 ${level.isCompleted ? "text-[#1a2332]" : "text-[#1a2332]"}`}
                      >
                        {level.title}
                      </h3>
                    )}

                    {level.isLocked && <p className="text-xs md:text-sm font-semibold text-gray-500 mb-1">الأسبوع {level.week}</p>}

                    {!level.isLocked && (
                      <p className={`text-xs md:text-sm ${level.isCompleted ? "text-gray-600" : "text-gray-600"}`}>
                        {level.description}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[#d8a355]/20">
                    <div className="flex flex-col gap-2 md:gap-3">
                      <div className="flex items-center gap-1 md:gap-2 justify-center">
                        <Zap className="w-4 h-4 md:w-5 md:h-5 text-[#d8a355]" />
                        <span className="text-sm md:text-base font-semibold text-[#1a2332]">{level.userPoints} نقطة</span>
                      </div>
                      {level.isCompleted ? (
                        <Button
                          disabled
                          className="w-full bg-[#d8a355] text-[#00312e] font-bold h-10 md:h-12 text-sm md:text-base rounded-lg flex items-center justify-center gap-2 opacity-40 cursor-not-allowed no-underline hover:no-underline focus:no-underline"
                          style={{ marginTop: '4px' }}
                        >
                          مكتمل
                        </Button>
                      ) : (
                        (!level.isLocked && !level.isCompleted) ? (
                          <Button
                            onClick={() => router.push(`/pathways/level/${level.id}`)}
                            className="w-full bg-[#d8a355] hover:bg-[#c99245] text-[#00312e] font-bold h-10 md:h-12 text-sm md:text-base rounded-lg no-underline hover:no-underline focus:no-underline"
                            style={{ marginTop: '4px' }}
                          >
                            ابدأ
                          </Button>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
