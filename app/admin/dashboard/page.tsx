"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  UserPlus,
  UserMinus,
  Users,
  BookOpen,
  Settings,
  FileText,
  Award,
  Upload,
  Map,
  Zap,
  UserCheck,
  Edit2,
  MessageSquare,
  Phone,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useToast } from "@/hooks/use-toast"

interface Circle {
  name: string
  studentCount: number
  created_at: string
}

interface AllUser {
  id: string
  name: string
  role: string
  account_number: number
  phone_number?: string
  id_number?: string
  halaqah?: string
  guardian_phone?: string
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentIdNumber, setNewStudentIdNumber] = useState("")
  const [newStudentAccountNumber, setNewStudentAccountNumber] = useState("")
  const [newGuardianPhone, setNewGuardianPhone] = useState("")
  const [selectedCircleToAdd, setSelectedCircleToAdd] = useState("")
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false)
  const [isRemoveStudentDialogOpen, setIsRemoveStudentDialogOpen] = useState(false)
  const [selectedCircleToRemove, setSelectedCircleToRemove] = useState("")
  const [selectedStudentToRemove, setSelectedStudentToRemove] = useState("")
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalTeachers, setTotalTeachers] = useState(0)
  const [totalAdmins, setTotalAdmins] = useState(0)
  const [totalCircles, setTotalCircles] = useState(3)
  const [studentsInCircles, setStudentsInCircles] = useState<Record<string, any[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [circles, setCircles] = useState<Circle[]>([])
  const router = useRouter()

  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editGuardianPhone, setEditGuardianPhone] = useState("")
  const [editStudentIdNumber, setEditStudentIdNumber] = useState("")
  const [selectedCircleForEdit, setSelectedCircleForEdit] = useState("")
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState("")

  const [isAllUsersDialogOpen, setIsAllUsersDialogOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<AllUser[]>([])
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)

  const [isStudentManagementDialogOpen, setIsStudentManagementDialogOpen] = useState(false) // Declare the variable here
  const [isStudentRecordsDialogOpen, setIsStudentRecordsDialogOpen] = useState(false)
  const [selectedCircleForRecords, setSelectedCircleForRecords] = useState("")
  const [selectedStudentForRecords, setSelectedStudentForRecords] = useState("")
  const [studentRecords, setStudentRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [selectedStudentName, setSelectedStudentName] = useState("")

  const [isEditPointsDialogOpen, setIsEditPointsDialogOpen] = useState(false)
  const [selectedCircleForPoints, setSelectedCircleForPoints] = useState("")
  const [selectedStudentForPoints, setSelectedStudentForPoints] = useState("")
  const [editingStudentPoints, setEditingStudentPoints] = useState<any>(null)
  const [newPoints, setNewPoints] = useState("")

  // Added state for user role dialog and search
  const [isUserRoleDialogOpen, setIsUserRoleDialogOpen] = useState(false)
  const [searchUserQuery, setSearchUserQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Added state for achievements dialog
  const [isAchievementsDialogOpen, setIsAchievementsDialogOpen] = useState(false)
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])

  const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false)

  const availableStudentsToRemove = selectedCircleToRemove ? studentsInCircles[selectedCircleToRemove] || [] : []

  const [isDragging, setIsDragging] = useState(false)
  const [isAchievementDragging, setIsAchievementDragging] = useState(false)

  const [newAchievement, setNewAchievement] = useState({
    title: "",
    date: "",
    description: "",
    status: "مكتمل",
    level: "ممتاز",
    icon_type: "trophy",
    image: null as File | null,
    image_url: "",
  })

  const [newProgram, setNewProgram] = useState({
    name: "",
    date: "",
    duration: "",
    points: "",
    description: "",
    is_active: false,
    file: null as File | null,
    file_url: "",
  })

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingAchievementImage, setUploadingAchievementImage] = useState(false)
  const [isGamesManagementDialogOpen, setIsGamesManagementDialogOpen] = useState(false)

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      present: "حاضر",
      absent: "غائب",
      excused: "مستأذن",
    }
    return statusMap[status] || status
  }

  const translateLevel = (level: string) => {
    if (!level || level === "not_completed" || level === "null") {
      return "لم يكمل"
    }
    const levelMap: Record<string, string> = {
      excellent: "ممتاز",
      very_good: "جيد جداً",
      good: "جيد",
      acceptable: "مقبول",
      weak: "ضعيف",
    }
    return levelMap[level] || level
  }

  const confirmDialog = useConfirmDialog()
  const alertDialog = useAlertDialog()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole !== "admin") {
      router.push("/login")
    } else {
      const loadData = async () => {
        await Promise.all([fetchCircles(), fetchStudents(), fetchTeachers(), fetchAdmins()])
        setIsLoading(false)
      }
      loadData()
    }
  }, [router])

  const fetchTeachers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("users").select("*").eq("role", "teacher")

      if (error) {
        console.error("[v0] Error fetching teachers:", error)
        return
      }

      if (data) {
        setTotalTeachers(data.length)
        console.log("[v0] Teachers count:", data.length)
      }
    } catch (error) {
      console.error("[v0] Error fetching teachers:", error)
    }
  }

  const fetchAdmins = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("users").select("*").eq("role", "admin")

      if (error) {
        console.error("[v0] Error fetching admins:", error)
        return
      }

      if (data) {
        setTotalAdmins(data.length)
        console.log("[v0] Admins count:", data.length)
      }
    } catch (error) {
      console.error("[v0] Error fetching admins:", error)
    }
  }

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      console.log("[v0] Circles fetched:", data.circles)
      if (data.circles) {
        setCircles(data.circles)
        setTotalCircles(data.circles.length)
        // Set first circle as default if available
        if (data.circles.length > 0 && !selectedCircleToAdd) {
          setSelectedCircleToAdd(data.circles[0].name)
          console.log("[v0] Default circle selected:", data.circles[0].name)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()

      if (data.students) {
        setTotalStudents(data.students.length)

        const grouped: Record<string, any[]> = {}
        data.students.forEach((student: any) => {
          if (!grouped[student.circle_name]) {
            grouped[student.circle_name] = []
          }
          grouped[student.circle_name].push(student)
        })
        setStudentsInCircles(grouped)
      }
    } catch (error) {
      console.error("[v0] Error fetching students:", error)
    }
  }

  const fetchAchievements = async () => {
    setIsLoadingAchievements(true)
    try {
      const response = await fetch("/api/achievements")
      const data = await response.json()
      setAchievements(data.achievements || [])
    } catch (error) {
      console.error("[v0] Error fetching achievements:", error)
    } finally {
      setIsLoadingAchievements(false)
    }
  }

  const fetchAllUsers = async () => {
    setIsLoadingAllUsers(true)
    try {
      console.log("[v0] Fetching all users...")

      const studentsResponse = await fetch("/api/students")
      const studentsData = await studentsResponse.json()
      console.log("[v0] Students data:", studentsData)

      const supabase = createClient()

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("account_number", { ascending: true })

      console.log("[v0] Users data:", usersData)
      console.log("[v0] Users error:", usersError)

      const combinedUsers: AllUser[] = []

      const admins: AllUser[] = []
      const teachers: AllUser[] = []
      const students_list: AllUser[] = []

      // Add students
      if (studentsData.students) {
        studentsData.students.forEach((student: any) => {
          students_list.push({
            id: student.id,
            name: student.name,
            role: "طالب",
            account_number: student.account_number,
            phone_number: student.guardian_phone,
            guardian_phone: student.guardian_phone,
            id_number: student.id_number,
            halaqah: student.circle_name || student.halaqah,
          })
        })
      }

      // Add teachers and admins
      if (usersData) {
        usersData.forEach((user: any) => {
          const userData: AllUser = {
            id: user.id,
            name: user.name,
            role: user.role === "teacher" ? "معلم" : user.role === "admin" ? "إداري" : user.role,
            account_number: user.account_number,
            phone_number: user.phone_number,
            id_number: user.id_number,
            halaqah: user.halaqah,
          }

          if (user.role === "admin") {
            admins.push(userData)
          } else if (user.role === "teacher") {
            teachers.push(userData)
          }
        })
      }

      // Sort each group by account number
      admins.sort((a, b) => (a.account_number || 0) - (b.account_number || 0))
      teachers.sort((a, b) => (a.account_number || 0) - (b.account_number || 0))
      students_list.sort((a, b) => (a.account_number || 0) - (b.account_number || 0))

      // Combine in order: admins, teachers, students
      combinedUsers.push(...admins, ...teachers, ...students_list)

      console.log("[v0] Combined users:", combinedUsers)
      setAllUsers(combinedUsers)
    } catch (error) {
      console.error("[v0] Error fetching all users:", error)
    } finally {
      setIsLoadingAllUsers(false)
    }
  }

  const handleOpenAllUsersDialog = () => {
    setIsAllUsersDialogOpen(true)
    fetchAllUsers()
  }

  const handleAddStudent = async () => {
    if (newStudentName.trim() && newStudentIdNumber.trim() && newStudentAccountNumber.trim()) {
      setIsSubmitting(true)
      try {
        const initialPoints = 0

        console.log("[v0] Adding student with circle:", selectedCircleToAdd)

        const response = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStudentName,
            circle_name: selectedCircleToAdd,
            id_number: newStudentIdNumber,
            guardian_phone: newGuardianPhone,
            account_number: Number.parseInt(newStudentAccountNumber),
            initial_points: initialPoints,
          }),
        })

        const data = await response.json()
        console.log("[v0] Student added response:", data)

        if (response.ok) {
          toast({
            title: "✓ تم الحفظ بنجاح",
            description: `تم إضافة الطالب ${newStudentName} إلى ${selectedCircleToAdd} بنجاح`,
            className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
          })
          setNewStudentName("")
          setNewStudentIdNumber("")
          setNewStudentAccountNumber("")
          setNewGuardianPhone("")
          setIsAddStudentDialogOpen(false)
          fetchStudents()
        } else {
          alert(data.error || "فشل في إضافة الطالب")
        }
      } catch (error) {
        console.error("[v0] Error adding student:", error)
        alert("حدث خطأ أثناء إضافة الطالب")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleAchievementImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewAchievement({ ...newAchievement, image: file })
    }
  }

  const handleAchievementDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAchievementDragging(true)
  }

  const handleAchievementDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAchievementDragging(false)
  }

  const handleAchievementDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAchievementDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setNewAchievement({ ...newAchievement, image: file })
    }
  }

  const handleAddAchievement = async () => {
    if (!newAchievement.title) {
      await alertDialog("الرجاء إدخال عنوان الإنجاز")
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl = ""

      if (newAchievement.image) {
        setUploadingAchievementImage(true)
        const formData = new FormData()
        formData.append("file", newAchievement.image)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("فشل رفع الصورة")
        }

        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
        setUploadingAchievementImage(false)
      }

      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAchievement,
          image_url: imageUrl,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await alertDialog("تم إضافة الإنجاز بنجاح")
        setNewAchievement({
          title: "",
          date: "",
          description: "",
          status: "مكتمل",
          level: "ممتاز",
          icon_type: "trophy",
          image: null,
          image_url: "",
        })
        fetchAchievements()
      } else {
        await alertDialog(data.error || "فشل في إضافة الإنجاز")
      }
    } catch (error) {
      console.error("[v0] Error adding achievement:", error)
      await alertDialog("حدث خطأ أثناء إضافة الإنجاز")
    } finally {
      setIsSubmitting(false)
      setUploadingAchievementImage(false)
    }
  }

  // إزالة زر الطلابي والإبقاء فقط على زر إضافة إنجاز عام
  const handleAddAchievementPublic = async () => {
    if (!newAchievement.title) {
      await alertDialog("الرجاء إدخال عنوان الإنجاز")
      return
    }
    setIsSubmitting(true)
    try {
      let imageUrl = ""
      if (newAchievement.image) {
        setUploadingAchievementImage(true)
        const formData = new FormData()
        formData.append("file", newAchievement.image)
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (!uploadResponse.ok) {
          throw new Error("فشل رفع الصورة")
        }
        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
        setUploadingAchievementImage(false)
      }
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAchievement,
          image_url: imageUrl,
          achievement_type: "public",
        }),
      })
      const data = await response.json()
      if (response.ok) {
        await alertDialog("تم إضافة الإنجاز بنجاح")
        setNewAchievement({
          title: "",
          date: "",
          description: "",
          status: "مكتمل",
          level: "ممتاز",
          icon_type: "trophy",
          image: null,
          image_url: "",
        })
        fetchAchievements()
      } else {
        await alertDialog(data.error || "فشل في إضافة الإنجاز")
      }
    } catch (error) {
      console.error("[v0] Error adding achievement:", error)
      await alertDialog("حدث خطأ أثناء إضافة الإنجاز")
    } finally {
      setIsSubmitting(false)
      setUploadingAchievementImage(false)
    }
  }

  const handleDeleteAchievement = async (id: string) => {
    const confirmed = await confirmDialog("هل أنت متأكد من حذف هذا الإنجاز؟", "تأكيد حذف الإنجاز")
    if (!confirmed) return

    try {
      const response = await fetch(`/api/achievements?id=${id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✓ تم الحذف بنجاح",
          description: "تم حذف الإنجاز من القائمة",
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        })
        fetchAchievements()
      } else {
        toast({
          title: "فشل في حذف الإنجاز",
          description: data.error || "حدث خطأ أثناء حذف الإنجاز",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting achievement:", error)
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء حذف الإنجاز",
        variant: "destructive",
      })
    }
  }

  const handleProgramFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewProgram({ ...newProgram, file })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setNewProgram({ ...newProgram, file })
    }
  }

  const handleRemoveStudent = async () => {
    if (selectedStudentToRemove) {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/students?id=${selectedStudentToRemove}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (response.ok) {
          const studentName = availableStudentsToRemove.find((s) => s.id === selectedStudentToRemove)?.name
          toast({
            title: "✓ تم الحذف بنجاح",
            description: `تم إزالة الطالب ${studentName} من ${selectedCircleToRemove} بنجاح`,
            className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
          })
          setSelectedStudentToRemove("")
          setSelectedCircleToRemove("")
          setIsRemoveStudentDialogOpen(false)
          fetchStudents()
        } else {
          alert(data.error || "فشل في إزالة الطالب")
        }
      } catch (error) {
        console.error("[v0] Error removing student:", error)
        alert("حدث خطأ أثناء إزالة الطالب")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleOpenEditDialog = () => {
    setSelectedCircleForEdit("")
    setSelectedStudentForEdit("")
    setEditingStudent(null)
    setEditGuardianPhone("")
    setEditStudentIdNumber("")
    setIsEditStudentDialogOpen(true)
  }

  const handleSelectStudentForEdit = (studentId: string) => {
    setSelectedStudentForEdit(studentId)
    const student = studentsInCircles[selectedCircleForEdit]?.find((s) => s.id === studentId)
    if (student) {
      setEditingStudent(student)
      setEditGuardianPhone(student.guardian_phone || "")
      setEditStudentIdNumber(student.id_number || "")
    }
  }

  const handleSaveStudentEdit = async () => {
    if (!editingStudent) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingStudent.id,
          guardian_phone: editGuardianPhone,
          id_number: editStudentIdNumber,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✓ تم الحفظ بنجاح",
          description: `تم تحديث معلومات الطالب ${editingStudent.name} بنجاح`,
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        })
        setIsEditStudentDialogOpen(false)
        setEditingStudent(null)
        fetchStudents()
      } else {
        alert("فشل في تحديث الطالب")
      }
    } catch (error) {
      console.error("[v0] Error updating student:", error)
      alert("حدث خطأ أثناء تحديث الطالب")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectStudentForPoints = (studentId: string) => {
    setSelectedStudentForPoints(studentId)
    const student = studentsInCircles[selectedCircleForPoints]?.find((s) => s.id === studentId)
    if (student) {
      setEditingStudentPoints(student)
      setNewPoints(student.points?.toString() || "0")
    }
  }

  const handleSavePoints = async () => {
    if (!editingStudentPoints) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/students?id=${editingStudentPoints.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: Number.parseInt(newPoints),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✓ تم الحفظ بنجاح",
          description: `تم تحديث نقاط الطالب ${editingStudentPoints.name} إلى ${newPoints} نقطة`,
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        })
        setIsEditPointsDialogOpen(false)
        setEditingStudentPoints(null)
        setNewPoints("")
        fetchStudents()
      } else {
        alert("فشل في تحديث النقاط")
      }
    } catch (error) {
      console.error("[v0] Error updating points:", error)
      alert("حدث خطأ أثناء تحديث النقاط")
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchStudentRecords = async (studentId: string) => {
    setIsLoadingRecords(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          evaluations (
            hafiz_level,
            tikrar_level,
            samaa_level,
            rabet_level
          )
        `)
        .eq("student_id", studentId)
        .order("date", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching student records:", error)
        return
      }

      console.log("[v0] Student records fetched:", data)
      setStudentRecords(data || [])
    } catch (error) {
      console.error("[v0] Error fetching student records:", error)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleSelectStudentForRecords = (studentId: string) => {
    setSelectedStudentForRecords(studentId)
    const student = studentsInCircles[selectedCircleForRecords]?.find((s) => s.id === studentId)
    if (student) {
      setSelectedStudentName(student.name)
      fetchStudentRecords(studentId)
    }
  }

  const handleOpenRecordsDialog = () => {
    setIsStudentManagementDialogOpen(false)
    setIsStudentRecordsDialogOpen(true)
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

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1a2332] mb-2">لوحة تحكم الإدارة</h1>
            <p className="text-lg text-[#1a2332]/70">إدارة شاملة لجميع الحلقات والمعلمين والطلاب</p>
          </div>

          {/* تصغير مربعات الإجمالي على الجوال - شبكة 2x2 بدلاً من عمود واحد */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
            <Card className="border border-[#D4AF37]/30 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-[#f5f1e8]/50">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-xl text-[#1a2332]">
                  <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <Users className="w-4 h-4 md:w-6 md:h-6 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm md:text-xl">إجمالي الطلاب</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C9A961] bg-clip-text text-transparent">
                  {totalStudents}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#D4AF37]/30 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-[#f5f1e8]/50">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-xl text-[#1a2332]">
                  <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <Settings className="w-4 h-4 md:w-6 md:h-6 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm md:text-xl">إجمالي المعلمين</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C9A961] bg-clip-text text-transparent">
                  {totalTeachers}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#D4AF37]/30 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-[#f5f1e8]/50">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-xl text-[#1a2332]">
                  <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <Settings className="w-4 h-4 md:w-6 md:h-6 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm md:text-xl">إجمالي الإداريين</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C9A961] bg-clip-text text-transparent">
                  {totalAdmins}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#D4AF37]/30 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-[#f5f1e8]/50">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-xl text-[#1a2332]">
                  <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm md:text-xl">إجمالي الحلقات</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#C9A961] bg-clip-text text-transparent">
                  {totalCircles}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Position 1: Student Management */}
            <Dialog open={isStudentManagementDialogOpen} onOpenChange={setIsStudentManagementDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                  onClick={(e) => {
                    e.preventDefault()
                    setIsStudentManagementDialogOpen(true)
                  }}
                >
                  <Users className="w-5 h-5 ml-2" />
                  إدارة الطلاب
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a2332]">إدارة الطلاب</DialogTitle>
                  <DialogDescription className="text-base">اختر العملية المطلوبة</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <Button
                    onClick={() => {
                      setIsStudentManagementDialogOpen(false)
                      setIsAddStudentDialogOpen(true)
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <UserPlus className="w-5 h-5 ml-2" />
                    إضافة طالب
                  </Button>
                  <Button
                    onClick={() => {
                      setIsStudentManagementDialogOpen(false)
                      setIsRemoveStudentDialogOpen(true)
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <UserMinus className="w-5 h-5 ml-2" />
                    إزالة طالب
                  </Button>
                  <Button
                    onClick={() => {
                      setIsStudentManagementDialogOpen(false)
                      handleOpenEditDialog()
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <Settings className="w-5 h-5 ml-2" />
                    تعديل بيانات الطالب
                  </Button>
                  <Button
                    onClick={() => {
                      setIsStudentManagementDialogOpen(false)
                      setIsEditPointsDialogOpen(true)
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <Edit2 className="w-5 h-5 ml-2" />
                    تعديل نقاط الطالب
                  </Button>
                  <Button
                    onClick={handleOpenRecordsDialog}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <FileText className="w-5 h-5 ml-2" />
                    سجلات الطلاب
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsStudentManagementDialogOpen(false)}
                    className="font-bold"
                  >
                    إغلاق
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Position 2: Teachers Management */}
            <Button
              onClick={(e) => {
                e.preventDefault()
                router.push("/admin/teachers")
              }}
              className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
            >
              <Settings className="w-5 h-5 ml-2" />
              إدارة المعلمين
            </Button>

            {/* Position 3: Circles Management */}
            <Button
              onClick={(e) => {
                e.preventDefault()
                router.push("/admin/circles")
              }}
              className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
            >
              <BookOpen className="w-5 h-5 ml-2" />
              إدارة الحلقات
            </Button>

            <Dialog open={isReportsDialogOpen} onOpenChange={setIsReportsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    setIsReportsDialogOpen(true)
                  }}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                >
                  <FileText className="w-5 h-5 ml-2" />
                  التقارير
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a2332]">التقارير</DialogTitle>
                  <DialogDescription className="text-base">اختر نوع التقرير</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <Button
                    onClick={() => {
                      setIsReportsDialogOpen(false)
                      router.push("/admin/teacher-attendance")
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <UserCheck className="w-5 h-5 ml-2" />
                    تقارير المعلمين
                  </Button>
                  <Button
                    onClick={() => {
                      setIsReportsDialogOpen(false)
                      router.push("/admin/reports")
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <MessageSquare className="w-5 h-5 ml-2" />
                    تقارير الرسائل
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsReportsDialogOpen(false)} className="font-bold">
                    إغلاق
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Games Management Dialog */}
            <Dialog open={isGamesManagementDialogOpen} onOpenChange={setIsGamesManagementDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    setIsGamesManagementDialogOpen(true)
                  }}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                >
                  <BookOpen className="w-5 h-5 ml-2" />
                  إدارة الألعاب
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a2332]">إدارة الألعاب</DialogTitle>
                  <DialogDescription className="text-base">اختر اللعبة التي تريد إدارتها</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <Button
                    onClick={() => {
                      setIsGamesManagementDialogOpen(false)
                      router.push("/admin/questions")
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <BookOpen className="w-5 h-5 ml-2" />
                    قاعدة أسئلة الفئات
                  </Button>
                  <Button
                    onClick={() => {
                      setIsGamesManagementDialogOpen(false)
                      router.push("/admin/auction-questions")
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <BookOpen className="w-5 h-5 ml-2" />
                    قاعدة أسئلة المزاد
                  </Button>
                  <Button
                    onClick={() => {
                      setIsGamesManagementDialogOpen(false)
                      router.push("/admin/daily-challenges")
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <Zap className="w-5 h-5 ml-2" />
                    إدارة التحدي اليومي
                  </Button>
                  <Button
                    onClick={() => {
                      setIsGamesManagementDialogOpen(false)
                      router.push("/admin/guess-images")
                    }}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold h-14 text-lg"
                  >
                    <Upload className="w-5 h-5 ml-2" />
                    قاعدة صور خمن الصورة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* WhatsApp Send Button */}


            {/* تم حذف زر إدارة إنجازات الطلاب الشخصية */}

            {/* زر الإرسال إلى أولياء الأمور */}
            <Button
              onClick={(e) => {
                e.preventDefault()
                router.push("/admin/whatsapp-send")
              }}
              className="bg-gradient-to-r from-[#25D366] to-[#20BA5A] hover:from-[#20BA5A] hover:to-[#1DA851] text-white font-bold"
            >
              <MessageSquare className="w-5 h-5 ml-2" />
              الإرسال إلى أولياء الأمور
            </Button>



            <Button
              onClick={(e) => {
                e.preventDefault()
                router.push("/admin/pathways")
              }}
              className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
            >
              <Map className="w-5 h-5 ml-2" />
              إدارة المسار
            </Button>

            {/* Points Management Dialog - Now hidden but still functional via student management menu */}
            <Dialog open={isEditPointsDialogOpen} onOpenChange={setIsEditPointsDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a2332]">تعديل نقاط الطالب</DialogTitle>
                  <DialogDescription className="text-base">اختر الحلقة والطالب لتعديل نقاطه</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsCircleSelect" className="text-base font-semibold text-[#1a2332]">
                      اختر الحلقة
                    </Label>
                    <Select
                      value={selectedCircleForPoints}
                      onValueChange={(value) => {
                        setSelectedCircleForPoints(value)
                        setSelectedStudentForPoints("")
                        setEditingStudentPoints(null)
                        setNewPoints("")
                      }}
                    >
                      <SelectTrigger className="w-full text-base">
                        <SelectValue placeholder="اختر الحلقة" />
                      </SelectTrigger>
                      <SelectContent>
                        {circles.map((circle) => (
                          <SelectItem key={circle.name} value={circle.name}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pointsStudentSelect" className="text-base font-semibold text-[#1a2332]">
                      اختر الطالب
                    </Label>
                    <Select
                      value={selectedStudentForPoints}
                      onValueChange={handleSelectStudentForPoints}
                      disabled={!selectedCircleForPoints}
                    >
                      <SelectTrigger className="w-full text-base">
                        <SelectValue placeholder={selectedCircleForPoints ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(studentsInCircles[selectedCircleForPoints] || []).map((student: any) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} - النقاط الحالية: {student.points || 0}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editingStudentPoints && (
                    <div className="space-y-2">
                      <Label htmlFor="newPoints" className="text-base font-semibold text-[#1a2332]">
                        النقاط الجديدة
                      </Label>
                      <Input
                        id="newPoints"
                        type="number"
                        value={newPoints}
                        onChange={(e) => setNewPoints(e.target.value)}
                        placeholder="أدخل النقاط الجديدة"
                        className="text-base"
                        min="0"
                      />
                      <p className="text-sm text-gray-500">النقاط الحالية: {editingStudentPoints.points || 0}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditPointsDialogOpen(false)
                      setEditingStudentPoints(null)
                      setNewPoints("")
                    }}
                    className="font-bold"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSavePoints}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                    disabled={!editingStudentPoints || !newPoints || isSubmitting}
                  >
                    {isSubmitting ? "جاري الحفظ..." : "حفظ النقاط"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAllUsersDialogOpen} onOpenChange={setIsAllUsersDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    handleOpenAllUsersDialog()
                  }}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                >
                  <Users className="w-5 h-5 ml-2" />
                  عرض جميع المستخدمين
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-[#1a2332]">جميع المستخدمين</DialogTitle>
                  <DialogDescription className="text-base">
                    عرض جميع المستخدمين المسجلين في النظام (طلاب، معلمين، إداريين)
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {isLoadingAllUsers ? (
                    <div className="text-center py-8 text-[#1a2332]">جاري تحميل المستخدمين...</div>
                  ) : allUsers.length === 0 ? (
                    <div className="text-center py-8 text-[#1a2332]/60">لا يوجد مستخدمين مسجلين</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">رقم الحساب</TableHead>
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-right">نوع الحساب</TableHead>
                          <TableHead className="text-right">رقم الهوية</TableHead>
                          <TableHead className="text-right">رقم الجوال / ولي الأمر</TableHead>
                          <TableHead className="text-right">الحلقة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.account_number}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  user.role === "طالب"
                                    ? "bg-blue-100 text-blue-800"
                                    : user.role === "معلم"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>{user.id_number || "-"}</TableCell>
                            <TableCell dir="ltr" className="text-right">
                              {user.phone_number || "-"}
                              {user.role === "طالب" && user.guardian_phone && (
                                <span className="text-xs text-gray-500 block">(ولي الأمر)</span>
                              )}
                            </TableCell>
                            <TableCell>{user.halaqah || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsAllUsersDialogOpen(false)} className="font-bold">
                    إغلاق
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* NEW BUTTON START */}
            <Button
              onClick={(e) => {
                e.preventDefault()
                router.push("/admin/admins")
              }}
              className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
            >
              <Settings className="w-5 h-5 ml-2" />
              إدارة الإداريين
            </Button>
            {/* NEW BUTTON END */}
            {/* Add student reports button in the main navigation area after other buttons */}
            {/* Removed the standalone student reports button - now only accessible via Reports dialog */}
            {/* </CHANGE> */}
          </div>

          <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1a2332]">إضافة طالب جديد</DialogTitle>
                <DialogDescription className="text-base">أدخل معلومات الطالب واختر الحلقة</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName" className="text-base font-semibold text-[#1a2332]">
                    اسم الطالب
                  </Label>
                  <Input
                    id="studentName"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="أدخل اسم الطالب"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentAccountNumber" className="text-base font-semibold text-[#1a2332]">
                    رقم الحساب
                  </Label>
                  <Input
                    id="studentAccountNumber"
                    value={newStudentAccountNumber}
                    onChange={(e) => setNewStudentAccountNumber(e.target.value)}
                    placeholder="أدخل رقم الحساب"
                    className="text-base"
                    dir="ltr"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentIdNumber" className="text-base font-semibold text-[#1a2332]">
                    رقم الهوية
                  </Label>
                  <Input
                    id="studentIdNumber"
                    value={newStudentIdNumber}
                    onChange={(e) => setNewStudentIdNumber(e.target.value)}
                    placeholder="أدخل رقم الهوية"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhoneNumber" className="text-base font-semibold text-[#1a2332]">
                    رقم جوال ولي الأمر
                  </Label>
                  <Input
                    id="guardianPhoneNumber"
                    value={newGuardianPhone}
                    onChange={(e) => setNewGuardianPhone(e.target.value)}
                    placeholder="966501234567"
                    className="text-base"
                    dir="ltr"
                    type="tel"
                  />
                  <p className="text-xs text-gray-500">مثال: 966501234567</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="circleSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الحلقة
                  </Label>
                  <Select value={selectedCircleToAdd} onValueChange={setSelectedCircleToAdd}>
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)} className="font-bold">
                  إلغاء
                </Button>
                <Button
                  onClick={handleAddStudent}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                  disabled={
                    !newStudentName.trim() ||
                    !newStudentIdNumber.trim() ||
                    !newStudentAccountNumber.trim() ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isRemoveStudentDialogOpen} onOpenChange={setIsRemoveStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1a2332]">إزالة طالب</DialogTitle>
                <DialogDescription className="text-base">اختر الحلقة ثم اختر الطالب المراد إزالته</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="removeCircleSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الحلقة
                  </Label>
                  <Select
                    value={selectedCircleToRemove}
                    onValueChange={(value) => {
                      setSelectedCircleToRemove(value)
                      setSelectedStudentToRemove("")
                    }}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="removeStudentSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الطالب
                  </Label>
                  <Select
                    value={selectedStudentToRemove}
                    onValueChange={setSelectedStudentToRemove}
                    disabled={!selectedCircleToRemove}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder={selectedCircleToRemove ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudentsToRemove.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRemoveStudentDialogOpen(false)
                    setSelectedCircleToRemove("")
                    setSelectedStudentToRemove("")
                  }}
                  className="font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleRemoveStudent}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                  disabled={!selectedStudentToRemove || !selectedCircleToRemove || isSubmitting}
                >
                  {isSubmitting ? "جاري الإزالة..." : "إزالة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditStudentDialogOpen} onOpenChange={setIsEditStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1a2332]">تعديل بيانات الطالب</DialogTitle>
                <DialogDescription className="text-base">اختر الحلقة والطالب لتعديل معلوماته</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editCircleSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الحلقة
                  </Label>
                  <Select
                    value={selectedCircleForEdit}
                    onValueChange={(value) => {
                      setSelectedCircleForEdit(value)
                      setSelectedStudentForEdit("")
                      setEditingStudent(null)
                    }}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStudentSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الطالب
                  </Label>
                  <Select
                    value={selectedStudentForEdit}
                    onValueChange={handleSelectStudentForEdit}
                    disabled={!selectedCircleForEdit}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder={selectedCircleForEdit ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(studentsInCircles[selectedCircleForEdit] || []).map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingStudent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="editStudentIdNum" className="text-base font-semibold text-[#1a2332]">
                        رقم الهوية
                      </Label>
                      <Input
                        id="editStudentIdNum"
                        value={editStudentIdNumber}
                        onChange={(e) => setEditStudentIdNumber(e.target.value)}
                        placeholder="أدخل رقم الهوية"
                        className="text-base"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editGuardianPhone" className="text-base font-semibold text-[#1a2332]">
                        رقم جوال ولي الأمر
                      </Label>
                      <Input
                        id="editGuardianPhone"
                        value={editGuardianPhone}
                        onChange={(e) => setEditGuardianPhone(e.target.value)}
                        placeholder="966501234567"
                        className="text-base"
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-500">مثال: 966501234567</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditStudentDialogOpen(false)
                    setEditingStudent(null)
                  }}
                  className="font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveStudentEdit}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C9A961] hover:from-[#C9A961] hover:to-[#BFA050] text-[#023232] font-bold"
                  disabled={!editingStudent || isSubmitting}
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isStudentRecordsDialogOpen} onOpenChange={setIsStudentRecordsDialogOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1a2332]">سجلات الطلاب</DialogTitle>
                <DialogDescription className="text-base">
                  اختر الحلقة والطالب لعرض سجلات الحضور والتقييم
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="recordsCircleSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الحلقة
                  </Label>
                  <Select
                    value={selectedCircleForRecords}
                    onValueChange={(value) => {
                      setSelectedCircleForRecords(value)
                      setSelectedStudentForRecords("")
                      setStudentRecords([])
                      setSelectedStudentName("")
                    }}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recordsStudentSelect" className="text-base font-semibold text-[#1a2332]">
                    اختر الطالب
                  </Label>
                  <Select
                    value={selectedStudentForRecords}
                    onValueChange={handleSelectStudentForRecords}
                    disabled={!selectedCircleForRecords}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder={selectedCircleForRecords ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(studentsInCircles[selectedCircleForRecords] || []).map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudentForRecords && (
                  <div className="mt-6">
                    <h3 className="text-xl font-bold text-[#1a2332] mb-4">سجلات الطالب: {selectedStudentName}</h3>
                    {isLoadingRecords ? (
                      <div className="text-center py-8 text-[#1a2332]">جاري تحميل السجلات...</div>
                    ) : studentRecords.length === 0 ? (
                      <div className="text-center py-8 text-[#1a2332]/60">لا توجد سجلات حضور لهذا الطالب</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الحفظ</TableHead>
                            <TableHead className="text-right">التكرار</TableHead>
                            <TableHead className="text-right">السماع</TableHead>
                            <TableHead className="text-right">الربط</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentRecords.map((record) => {
                            // عرض آخر تقييم وليس الأول
                            const lastEval = Array.isArray(record.evaluations) && record.evaluations.length > 0
                              ? record.evaluations[record.evaluations.length - 1]
                              : null;
                            console.log('[DEBUG][Dashboard] آخر تقييم:', lastEval);
                            return (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                  {new Date(record.date).toLocaleDateString("ar-SA")}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded-full text-sm ${
                                      record.status === "present"
                                        ? "bg-green-100 text-green-800"
                                        : record.status === "absent"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {translateStatus(record.status)}
                                  </span>
                                </TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.hafiz_level) || "-")}</TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.tikrar_level) || "-")}</TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.samaa_level) || "-")}</TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.rabet_level) || "-")}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsStudentRecordsDialogOpen(false)
                    setSelectedCircleForRecords("")
                    setSelectedStudentForRecords("")
                    setStudentRecords([])
                  }}
                  className="font-bold"
                >
                  إغلاق
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>

      <Footer />
    </div>
  )
}
