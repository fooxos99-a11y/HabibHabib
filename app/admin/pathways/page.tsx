"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Unlock, Plus, Trash2, FileText, Video, LinkIcon, Clock, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface LevelContent {
  id: string
  content_title: string
  content_description?: string
  content_url?: string
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

export default function AdminPathwaysPage() {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [levelStatuses, setLevelStatuses] = useState<Record<number, boolean>>({})
  const [levelContents, setLevelContents] = useState<Record<number, LevelContent[]>>({})
  const [levels, setLevels] = useState<any[]>([])
  const [levelEdit, setLevelEdit] = useState<{id:number|null, title:string, description:string, points:number}|null>(null)
  // عند جلب المستويات من القاعدة، أضف النقاط
  const [newLevelCount, setNewLevelCount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  // حالة خصم النصف من قاعدة البيانات
  const [levelHalfPointsApplied, setLevelHalfPointsApplied] = useState<Record<number, boolean>>({})

  const [showContentForm, setShowContentForm] = useState(false)
  const [inputType, setInputType] = useState<'link' | 'file'>('link')
  const [contentType, setContentType] = useState<'pdf' | 'video' | 'link'>("link")
  const [contentTitle, setContentTitle] = useState("")
  const [contentDescription, setContentDescription] = useState("")
  const [contentUrl, setContentUrl] = useState("")

  const [showQuizForm, setShowQuizForm] = useState(false)
  const [quizQuestion, setQuizQuestion] = useState("")
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""])
  const [correctAnswer, setCorrectAnswer] = useState(0)
  const [levelQuizzes, setLevelQuizzes] = useState<Record<number, any[]>>({})
  // تحميل الأسئلة من Supabase
  const fetchLevelQuizzes = async (levelNum: number) => {
    const { data, error } = await supabase
      .from('pathway_level_questions')
      .select('*')
      .eq('level_number', levelNum)
      .order('id');
    if (!error && data) {
      setLevelQuizzes((prev) => ({ ...prev, [levelNum]: data.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
      })) }));
    }
  }

  const [notification, setNotification] = useState<{ message: string; show: boolean }>({
    message: "",
    show: false,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )


  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole !== "admin") {
      router.push("/login")
      return
    }
    loadLevelStatuses()
    loadLevelContents()
    fetchLevelQuizzes(selectedLevel)
    loadLevelHalfPointsApplied()
    // جلب المستويات من القاعدة
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    fetchLevels(supabase).then(levelsArr => setLevels(levelsArr.map(l => ({...l, points: l.points ?? 100}))))
  }, [selectedLevel])

  // تحميل حالة خصم النصف من قاعدة البيانات
  const loadLevelHalfPointsApplied = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data, error } = await supabase.from('pathway_levels').select('id, half_points_applied');
    if (!error && data) {
      const applied: Record<number, boolean> = {};
      data.forEach((row: any) => {
        applied[row.id] = !!row.half_points_applied;
      });
      setLevelHalfPointsApplied(applied);
    }
  }

  const loadLevelStatuses = () => {
    const unlockedLevelsStr = localStorage.getItem("unlockedLevels")
    const unlockedLevels = unlockedLevelsStr ? JSON.parse(unlockedLevelsStr) : [1]

    const statusMap: Record<number, boolean> = {}
    levels.forEach((level) => {
      statusMap[level.id] = unlockedLevels.includes(level.id)
    })
    setLevelStatuses(statusMap)
  }

  // تحميل المحتوى من API
  const loadLevelContents = async () => {
    try {
      const res = await fetch(`/api/pathway-contents?level_id=${selectedLevel}`)
      const data = await res.json()
      setLevelContents((prev) => ({ ...prev, [selectedLevel]: data.contents || [] }))
    } catch {
      setLevelContents((prev) => ({ ...prev, [selectedLevel]: [] }))
    }
  }

  const loadLevelQuizzes = () => {
    const quizzesStr = localStorage.getItem("levelQuizzes")
    const quizzes = quizzesStr ? JSON.parse(quizzesStr) : {}
    setLevelQuizzes(quizzes)
  }

  const loadDynamicLevels = () => {
    const savedLevelsStr = localStorage.getItem("dynamicLevels")
    if (savedLevelsStr) {
      const savedLevels = JSON.parse(savedLevelsStr)
      setLevels(savedLevels)
    }
  }

  // تطبيق خصم النصف في قاعدة البيانات
  const handleApplyHalfPoints = async () => {
    const level = levels.find(l => l.level_number === selectedLevel);
    if (!level) return;
    const { error } = await supabase
      .from('pathway_levels')
      .update({ half_points_applied: true })
      .eq('id', level.id);
    if (!error) {
      setNotification({ message: `تم تطبيق خصم النصف على المستوى ${selectedLevel}. سيحصل الطلاب على 50 نقطة فقط بدلاً من 100 نقطة`, show: true });
      loadLevelHalfPointsApplied();
    } else {
      setNotification({ message: error.message, show: true });
    }
    setTimeout(() => setNotification({ message: "", show: false }), 5000);
  }

  // إزالة خصم النصف من قاعدة البيانات
  const handleRemoveHalfPoints = async () => {
    const level = levels.find(l => l.level_number === selectedLevel);
    if (!level) return;
    const { error } = await supabase
      .from('pathway_levels')
      .update({ half_points_applied: false })
      .eq('id', level.id);
    if (!error) {
      setNotification({ message: `تم إزالة خصم النصف من المستوى ${selectedLevel}. سيحصل الطلاب على 100 نقطة كاملة`, show: true });
      loadLevelHalfPointsApplied();
    } else {
      setNotification({ message: error.message, show: true });
    }
    setTimeout(() => setNotification({ message: "", show: false }), 5000);
  }

  const handleAddQuiz = async () => {
    if (!quizQuestion || quizOptions.some((opt) => !opt)) {
      setNotification({ message: "الرجاء إدخال السؤال وجميع الخيارات", show: true })
      setTimeout(() => setNotification({ message: "", show: false }), 3000)
      return
    }
    const { error } = await supabase.from('pathway_level_questions').insert({
      level_number: selectedLevel,
      question: quizQuestion,
      options: quizOptions,
      correct_answer: correctAnswer,
    });
    if (!error) {
      fetchLevelQuizzes(selectedLevel)
      setQuizQuestion("")
      setQuizOptions(["", "", "", ""])
      setCorrectAnswer(0)
      setNotification({ message: "تم إضافة السؤال بنجاح", show: true })
    } else {
      setNotification({ message: error.message, show: true })
    }
    setTimeout(() => setNotification({ message: "", show: false }), 3000)
  }

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return
    const { error } = await supabase.from('pathway_level_questions').delete().eq('id', quizId);
    if (!error) {
      fetchLevelQuizzes(selectedLevel)
      setNotification({ message: "تم حذف السؤال بنجاح", show: true })
    } else {
      setNotification({ message: error.message, show: true })
    }
    setTimeout(() => setNotification({ message: "", show: false }), 3000)
  }

  // تحديث حالة is_locked في قاعدة البيانات
  const updateLevelLock = async (levelId: number, isLocked: boolean) => {
    const { error } = await supabase
      .from('pathway_levels')
      .update({ is_locked: isLocked })
      .eq('id', levelId);
    if (!error) {
      setNotification({ message: isLocked ? "تم قفل المستوى بنجاح" : "تم فتح المستوى بنجاح", show: true });
      // أعد تحميل المستويات لتحديث الحالة
      fetchLevels(supabase).then(levelsArr => setLevels(levelsArr.map(l => ({...l, points: l.points ?? 100}))));
    } else {
      setNotification({ message: error.message, show: true });
    }
    setTimeout(() => setNotification({ message: "", show: false }), 3000);
  }

  // إضافة محتوى جديد عبر API
  const handleAddContent = async () => {
    if (!contentTitle || !contentUrl) {
      setNotification({ message: "الرجاء إدخال العنوان والرابط", show: true })
      setTimeout(() => setNotification({ message: "", show: false }), 3000)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/pathway-contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level_id: selectedLevel,
          content_title: contentTitle,
          content_description: contentDescription,
          content_url: contentUrl,
          content_type: contentType,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotification({ message: "تم إضافة المحتوى بنجاح", show: true })
        setContentTitle("")
        setContentDescription("")
        setContentUrl("")
        setContentType("link")
        setShowContentForm(false)
        loadLevelContents()
      } else {
        setNotification({ message: data.error || "فشل في إضافة المحتوى", show: true })
      }
    } catch {
      setNotification({ message: "فشل في إضافة المحتوى", show: true })
    }
    setIsLoading(false)
    setTimeout(() => setNotification({ message: "", show: false }), 3000)
  }

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المحتوى؟")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/pathway-contents?id=${contentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        // بعد الحذف من السيرفر، حدث الحالة المحلية
        const updatedContents = { ...levelContents };
        updatedContents[selectedLevel] = updatedContents[selectedLevel].filter((c) => c.id !== contentId);
        localStorage.setItem("levelContents", JSON.stringify(updatedContents));
        setLevelContents(updatedContents);
        setNotification({ message: "تم حذف المحتوى بنجاح", show: true });
      } else {
        setNotification({ message: data.error || "فشل في حذف المحتوى", show: true });
      }
    } catch {
      setNotification({ message: "فشل في حذف المحتوى", show: true });
    }
    setIsLoading(false);
    setTimeout(() => setNotification({ message: "", show: false }), 3000);
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-5 h-5" />
      case "video":
        return <Video className="w-5 h-5" />
      case "link":
        return <LinkIcon className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  // إضافة مستوى جديد
  const handleAddLevel = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const nextNumber = (levels[levels.length-1]?.level_number || 0) + 1;
    const { data, error } = await supabase.from('pathway_levels').insert({
      level_number: nextNumber,
      title: `المستوى ${nextNumber}`,
      description: '',
    }).select();
    if (!error) {
      fetchLevels(supabase).then(setLevels)
      setNotification({ message: `تم إضافة مستوى جديد! الآن لديك ${nextNumber} مستوى`, show: true })
    } else {
      setNotification({ message: error.message, show: true })
    }
    setTimeout(() => setNotification({ message: "", show: false }), 3000)
  }

  // حذف آخر مستوى
  const handleRemoveLevel = async () => {
    if (levels.length <= 1) {
      setNotification({ message: "يجب الاحتفاظ بمستوى واحد على الأقل", show: true })
      setTimeout(() => setNotification({ message: "", show: false }), 3000)
      return
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const lastLevel = levels[levels.length-1];
    const { error } = await supabase.from('pathway_levels').delete().eq('id', lastLevel.id);
    if (!error) {
      fetchLevels(supabase).then(setLevels)
      setNotification({ message: `تم حذف مستوى! الآن لديك ${levels.length-1} مستوى`, show: true })
    } else {
      setNotification({ message: error.message, show: true })
    }
    setTimeout(() => setNotification({ message: "", show: false }), 3000)
  }

  const levelContentList = levelContents[selectedLevel] || []
  const levelQuizList = levelQuizzes[selectedLevel] || []

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      {/* Notification display with beige design */}
      {notification.show && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <Card className="bg-[#fef8f0] border-2 border-[#d8a355] shadow-lg">
            <CardContent className="p-3 md:p-4">
              <p className="text-[#1a2332] font-medium text-center text-sm md:text-base">{notification.message}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="flex-1 py-6 md:py-12 px-3 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-[#1a2332] mb-1 md:mb-2">إدارة المسار</h1>
            {/* تم حذف نص الشرح */}
          </div>

          {/* تم حذف كرت إدارة المستويات بالكامل */}

          <Card className="mb-4 md:mb-8">
            <CardHeader className="p-3 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">اختر المستوى</CardTitle>
              </div>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleAddLevel} className="bg-green-600 hover:bg-green-700 text-white p-2 h-8 w-8 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>إضافة مستوى جديد</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleRemoveLevel} disabled={levels.length <= 1} className="bg-red-600 hover:bg-red-700 text-white p-2 h-8 w-8 flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>حذف آخر مستوى</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          const level = levels.find(l => l.level_number === selectedLevel);
                          if (level && level.id !== 1) {
                            updateLevelLock(level.id, !(level.is_locked));
                          }
                        }}
                        disabled={selectedLevel === 1}
                        className={levels.find(l => l.level_number === selectedLevel)?.is_locked
                          ? "bg-green-600 hover:bg-green-700 text-white p-2 h-8 w-8 flex items-center justify-center"
                          : "bg-red-600 hover:bg-red-700 text-white p-2 h-8 w-8 flex items-center justify-center"}
                      >
                        {levels.find(l => l.level_number === selectedLevel)?.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{levels.find(l => l.level_number === selectedLevel)?.is_locked ? "فتح المستوى" : "قفل المستوى"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleApplyHalfPoints} className="bg-orange-600 hover:bg-orange-700 text-white p-2 h-8 w-8 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>تطبيق خصم نصف النقاط</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleRemoveHalfPoints} className="bg-red-600 hover:bg-red-700 text-white p-2 h-8 w-8 flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>إزالة خصم نصف النقاط</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                {levels.map((level) => {
                  return (
                    <Button
                      key={level.id}
                      onClick={() => {
                        setSelectedLevel(level.level_number)
                        setShowContentForm(false)
                        setShowQuizForm(false)
                      }}
                      variant={selectedLevel === level.level_number ? "default" : "outline"}
                      size="sm"
                      className={
                        selectedLevel === level.level_number
                          ? "bg-[#d8a355] hover:bg-[#c99245] text-[#00312e] relative text-xs md:text-base"
                          : "border-[#d8a355] text-[#d8a355] hover:bg-[#d8a355]/10 relative text-xs md:text-base"
                      }
                    >
                      <span onClick={e => {e.stopPropagation(); setLevelEdit({id:level.id, title:level.title, description:level.description||'', points:level.points ?? 100})}} className="cursor-pointer text-[#00312e] no-underline hover:no-underline">{level.title}</span>
                      <span className="absolute top-0.5 left-0.5 md:top-1 md:left-1">
                        {level.is_locked ? (
                          <Lock className="w-2 md:w-3 h-2 md:h-3 text-red-600" />
                        ) : (
                          <Unlock className="w-2 md:w-3 h-2 md:h-3 text-green-600" />
                        )}
                      </span>
                    </Button>
                  )
                })}
                    {/* نافذة تعديل عنوان ووصف المستوى */}
                    {/* نافذة تعديل عنوان ووصف المستوى */}
                    {levelEdit && (
                      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                          <h2 className="text-xl font-bold mb-4">تعديل المستوى</h2>
                          <div className="mb-3">
                            <Label>العنوان</Label>
                            <Input value={levelEdit.title} onChange={e=>setLevelEdit({...levelEdit, title:e.target.value})} />
                          </div>
                          <div className="mb-3">
                            <Label>الوصف</Label>
                            <Textarea value={levelEdit.description} onChange={e=>setLevelEdit({...levelEdit, description:e.target.value})} />
                          </div>
                          <div className="mb-3">
                            <Label>النقاط</Label>
                            <Input type="number" min={0} value={levelEdit.points} onChange={e=>setLevelEdit({...levelEdit, points:Number(e.target.value)})} />
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async()=>{
                              const supabase = createBrowserClient(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                              );
                              await supabase.from('pathway_levels').update({title:levelEdit.title, description:levelEdit.description, points:levelEdit.points}).eq('id',levelEdit.id);
                              fetchLevels(supabase).then(levelsArr => setLevels(levelsArr.map(l => ({...l, points: l.points ?? 100}))))
                              setLevelEdit(null)
                              setNotification({ message: "تم تحديث المستوى بنجاح", show: true })
                              setTimeout(() => setNotification({ message: "", show: false }), 3000)
                            }}>حفظ</Button>
                            <Button variant="outline" onClick={()=>setLevelEdit(null)}>إلغاء</Button>
                          </div>
                        </div>
                      </div>
                    )}
              </div>
            </CardContent>
          </Card>


          {/* إشعار تطبيق خصم النصف */}
          {levelHalfPointsApplied[selectedLevel] && (
            <Card className="mb-4 md:mb-8 border-2 border-orange-300 bg-orange-50">
              <CardContent>
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    تم تطبيق خصم النصف على هذا المستوى
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-4 md:mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>المحتوى التعليمي للمستوى {selectedLevel}</CardTitle>
                  <CardDescription>
                    أضف ملفات PDF أو مقاطع فيديو أو روابط يشاهدها الطلاب قبل بدء الاختبار
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowContentForm(!showContentForm)}
                  className="bg-[#d8a355] hover:bg-[#c99245] text-[#00312e]"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة محتوى
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Content Form */}
              {showContentForm && (
                <Card className="mb-6 bg-[#fef8f0] border-[#d8a355]">
                  <CardContent className="pt-6">
                    <div className="space-y-4">



                      <div className="flex flex-col gap-4">
                        <div>
                          <Label className="mb-1 block">عنوان المحتوى *</Label>
                          <Input
                            value={contentTitle}
                            onChange={(e) => setContentTitle(e.target.value)}
                            placeholder="مثال: شرح الدرس الأول"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block">وصف المحتوى</Label>
                          <Textarea
                            value={contentDescription}
                            onChange={(e) => setContentDescription(e.target.value)}
                            placeholder="وصف مختصر للمحتوى (اختياري)"
                            rows={2}
                          />
                        </div>
                      </div>


                      <div>
                        <Label>نوع المحتوى *</Label>
                        <div className="flex gap-2 mb-2">
                          <Button
                            type="button"
                            variant={contentType === "link" ? "default" : "outline"}
                            onClick={() => setContentType("link")}
                          >رابط</Button>
                          <Button
                            type="button"
                            variant={contentType === "pdf" ? "default" : "outline"}
                            onClick={() => setContentType("pdf")}
                          >PDF</Button>
                          <Button
                            type="button"
                            variant={contentType === "video" ? "default" : "outline"}
                            onClick={() => setContentType("video")}
                          >فيديو</Button>
                        </div>
                        {contentType === "link" ? (
                          <Input
                            value={contentUrl || ""}
                            onChange={(e) => setContentUrl(e.target.value)}
                            placeholder="ضع الرابط هنا"
                            disabled={isLoading}
                          />
                        ) : (
                          <Input
                            value={contentUrl || ""}
                            onChange={(e) => setContentUrl(e.target.value)}
                            placeholder={contentType === "pdf" ? "رابط ملف PDF" : "رابط الفيديو"}
                            disabled={isLoading}
                          />
                        )}
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowContentForm(false)}>
                          إلغاء
                        </Button>
                        <Button onClick={handleAddContent} className="bg-[#d8a355] hover:bg-[#c99245] text-[#00312e]">
                          حفظ المحتوى
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content List */}
              {levelContentList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا يوجد محتوى تعليمي لهذا المستوى</p>
                  <p className="text-sm">اضغط على "إضافة محتوى" لإضافة ملفات أو مقاطع</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {levelContentList.map((content) => (
                    <Card key={content.id} className="border-[#d8a355]/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-[#d8a355] mt-1">{getContentIcon(content.content_type)}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#1a2332] mb-1">{content.content_title}</h4>
                              {content.content_description && (
                                <p className="text-sm text-gray-600 mb-2">{content.content_description}</p>
                              )}
                              <a
                                href={content.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#d8a355] no-underline hover:no-underline"
                              >
                                {content.content_url}
                              </a>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContent(content.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>الأسئلة للمستوى {selectedLevel}</CardTitle>
                  <CardDescription>
                    أضف أسئلة الاختبار للمستوى. النقاط تُقسم على عدد الأسئلة (100 نقطة ÷ عدد الأسئلة)
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowQuizForm(!showQuizForm)}
                  className="bg-[#d8a355] hover:bg-[#c99245] text-[#00312e]"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة سؤال
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Quiz Instructions */}
              <Card className="bg-[#faf9f6] border-2 border-[#d8a355]">
                <CardHeader>
                  <CardTitle className="text-[#1a2332]">اختبار المستوى</CardTitle>
                  <CardDescription className="text-gray-700">
                    أجب على {levelQuizList.length}{" "}
                    {levelQuizList.length === 1 ? "سؤال" : levelQuizList.length === 2 ? "سؤالين" : "أسئلة"} لإكمال هذا
                    المستوى. كل إجابة صحيحة تساوي {Math.round(100 / (levelQuizList.length || 1))} نقطة
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Add Quiz Form */}
              {showQuizForm && (
                <Card className="mb-6 bg-[#fef8f0] border-[#d8a355]">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label>السؤال *</Label>
                        <Input
                          value={quizQuestion}
                          onChange={(e) => setQuizQuestion(e.target.value)}
                          placeholder="اكتب السؤال هنا"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>الخيارات *</Label>
                        {quizOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-8">{index + 1}.</span>
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...quizOptions]
                                newOptions[index] = e.target.value
                                setQuizOptions(newOptions)
                              }}
                              placeholder={`الخيار ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <Label>الإجابة الصحيحة *</Label>
                        <Select value={correctAnswer.toString()} onValueChange={(v) => setCorrectAnswer(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {quizOptions.map((option, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                الخيار {index + 1}: {option || "(فارغ)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowQuizForm(false)}>
                          إلغاء
                        </Button>
                        <Button onClick={handleAddQuiz} className="bg-[#d8a355] hover:bg-[#c99245] text-[#00312e]">
                          حفظ السؤال
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quiz List */}
              {levelQuizList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد أسئلة لهذا المستوى</p>
                  <p className="text-sm">اضغط على "إضافة سؤال" لإضافة أسئلة الاختبار</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {levelQuizList.map((quiz, index) => (
                    <Card key={quiz.id} className="border-[#d8a355]/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-[#1a2332] mb-3">
                              {index + 1}. {quiz.question}
                            </h4>
                            <div className="space-y-1 mr-4">
                              {quiz.options.map((option: string, optIndex: number) => (
                                <div
                                  key={optIndex}
                                  className={`text-sm p-2 rounded ${
                                    optIndex === quiz.correctAnswer ? "bg-green-100 font-semibold" : "bg-gray-50"
                                  }`}
                                >
                                  {optIndex + 1}. {option}
                                  {optIndex === quiz.correctAnswer && (
                                    <span className="text-green-600 mr-2">(صحيحة)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
