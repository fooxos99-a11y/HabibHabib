"use client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronDown, User, LogOut, Users, LayoutDashboard, Menu, X, ClipboardCheck } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TeacherAttendanceModal } from "@/components/teacher-attendance-modal" // Fixed import to use correct file path and named import

interface Circle {
  name: string
  studentCount: number
}

const CIRCLES_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [clickedButton, setClickedButton] = useState<string | null>(null)
  const [isMobileProfileDropdownOpen, setIsMobileProfileDropdownOpen] = useState(false)
  const [isDesktopProfileDropdownOpen, setIsDesktopProfileDropdownOpen] = useState(false)
  const [circles, setCircles] = useState<Circle[]>([])
  const [circlesLoading, setCirclesLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [teacherInfo, setTeacherInfo] = useState<{
    id: string
    name: string
    accountNumber: number
  } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const confirmDialog = useConfirmDialog()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const role = localStorage.getItem("userRole")
    setIsLoggedIn(loggedIn)
    setUserRole(role)

    if (loggedIn && role === "teacher") {
      const accountNumber = localStorage.getItem("accountNumber")
      if (accountNumber) {
        fetchTeacherInfo(accountNumber)
      }
    }

    loadCircles()
  }, [])

  const loadCircles = () => {
    try {
      const cachedData = localStorage.getItem("circlesCache")
      const cacheTimestamp = localStorage.getItem("circlesCacheTime")

      if (cachedData && cacheTimestamp) {
        const age = Date.now() - Number.parseInt(cacheTimestamp)
        if (age < CIRCLES_CACHE_DURATION) {
          setCircles(JSON.parse(cachedData))
          setCirclesLoading(false)
          return
        }
      }

      fetchCircles()
    } catch (error) {
      console.error("[v0] Error loading circles cache:", error)
      fetchCircles()
    }
  }

  const fetchCircles = async () => {
    try {
      setCirclesLoading(true)
      const response = await fetch("/api/circles")
      const data = await response.json()
      if (data.circles) {
        setCircles(data.circles)
        localStorage.setItem("circlesCache", JSON.stringify(data.circles))
        localStorage.setItem("circlesCacheTime", Date.now().toString())
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    } finally {
      setCirclesLoading(false)
    }
  }

  const fetchTeacherInfo = async (accountNumber: string) => {
    try {
      const response = await fetch(`/api/teachers?account_number=${accountNumber}`)
      const data = await response.json()
      if (data.teachers && data.teachers.length > 0) {
        const teacher = data.teachers[0]
        setTeacherInfo({
          id: teacher.id,
          name: teacher.name,
          accountNumber: teacher.account_number,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching teacher info:", error)
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

      localStorage.removeItem("studentId")
      localStorage.removeItem("accountNumber")
      localStorage.removeItem("account_number")
      localStorage.removeItem("userRole")
      localStorage.removeItem("isLoggedIn")
      localStorage.removeItem("circlesCache")
      localStorage.removeItem("circlesCacheTime")
      setIsLoggedIn(false)
      setUserRole(null)
      setIsLoggingOut(false)
      scrollToTop()
      router.push("/")
    }
  }

  const handleProfileClick = () => {
    scrollToTop()
    if (userRole === "admin") {
      router.push("/admin/profile")
    } else if (userRole === "teacher") {
      router.push("/teacher/dashboard")
    } else {
      router.push("/profile")
    }
  }

  const handleNavClick = (href: string) => {
    setClickedButton(href)
    setTimeout(() => {
      setClickedButton(null)
    }, 300)
    scrollToTop()
    router.push(href)
  }

  const handleDropdownNavClick = (href: string) => {
    setIsMobileProfileDropdownOpen(false)
    setIsDesktopProfileDropdownOpen(false)
    scrollToTop()

    if (href.startsWith("/profile?tab=") && pathname === "/profile") {
      const tab = href.split("tab=")[1]
      window.history.pushState({}, "", href)
      window.dispatchEvent(new CustomEvent("tabChange", { detail: { tab } }))
    } else {
      router.push(href)
    }
  }

  const handleOpenAttendanceModal = () => {
    setIsMobileProfileDropdownOpen(false)
    setIsDesktopProfileDropdownOpen(false)
    setIsAttendanceModalOpen(true)
  }

  return (
    <>
      {isLoggedIn && userRole === "teacher" && teacherInfo && (
        <TeacherAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          teacherId={teacherInfo.id}
          teacherName={teacherInfo.name}
          accountNumber={teacherInfo.accountNumber}
        />
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-[#d8a355]/20 border-t-[#d8a355] rounded-full animate-spin" />
            <p className="text-xl font-bold text-[#d8a355]">جاري تسجيل الخروج...</p>
          </div>
        </div>
      )}

      <header className="bg-[#00312e] text-white py-1.5 px-3 sm:px-4 md:px-6 z-50">
        <div className="container mx-auto flex items-center justify-between">
          {/* Left side - Hamburger menu (mobile only) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-[#00312e]/80 rounded-lg transition-colors"
            aria-label="القائمة"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Center - Logo (mobile), Right - Logo (desktop) */}
          <div className="hidden md:flex items-center">
            <Image
              src="/images/logo-habib.png.webp"
              alt="شعار الحبيب"
              width={140}
              height={84}
              className="object-contain w-28 h-auto lg:w-32 lg:h-auto xl:w-36 xl:h-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(72%) sepia(35%) saturate(548%) hue-rotate(358deg) brightness(92%) contrast(87%)",
              }}
              loading="eager"
              sizes="(max-width: 1024px) 112px, (max-width: 1280px) 128px, 144px"
            />
          </div>

          {/* Right side - Login/Profile (mobile only) */}
          <div className="md:hidden">
            {isLoggedIn ? (
              <DropdownMenu open={isMobileProfileDropdownOpen} onOpenChange={setIsMobileProfileDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <div className="w-8 h-8 rounded-full bg-[#d8a355] flex items-center justify-center cursor-pointer ring-2 ring-[#d8a355] ring-offset-2 ring-offset-[#00312e] hover:ring-offset-4 transition-all duration-300">
                      <User className="w-4 h-4 text-[#00312e]" strokeWidth={2.5} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
                >
                  <DropdownMenuItem
                    onClick={handleProfileClick}
                    className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                  >
                    <User className="w-5 h-5 ml-2" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  {userRole === "admin" ? (
                    <DropdownMenuItem
                      onClick={() => handleDropdownNavClick("/admin/dashboard")}
                      className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                    >
                      <LayoutDashboard className="w-5 h-5 ml-2" />
                      لوحة التحكم
                    </DropdownMenuItem>
                  ) : userRole === "teacher" ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleDropdownNavClick("/teacher/halaqah/1")}
                        className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                      >
                        <Users className="w-5 h-5 ml-2" />
                        إدارة الحلقة
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleOpenAttendanceModal}
                        className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                      >
                        <ClipboardCheck className="w-5 h-5 ml-2" />
                        التحضير
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-base py-3 text-red-600 focus:bg-red-50 focus:text-red-700 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => {
                  scrollToTop()
                  router.push("/login")
                }}
                className="bg-gradient-to-r from-[#d8a355] to-[#c99347] hover:from-[#c99347] hover:to-[#b88341] text-[#00312e] font-bold px-3 py-1.5 text-xs h-8"
              >
                تسجيل الدخول
              </Button>
            )}
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-6 font-bold text-base lg:text-lg xl:text-xl">
            <button
              onClick={() => handleNavClick("/")}
              className={`hover:text-[#d8a355] transition-all duration-300 ${pathname === "/" ? "text-[#d8a355]" : ""} ${
                clickedButton === "/" ? "scale-95 opacity-70" : "hover:scale-105"
              }`}
            >
              الرئيسية
            </button>
            <button
              onClick={() => handleNavClick("/achievements")}
              className={`hover:text-[#d8a355] transition-all duration-300 ${
                pathname === "/achievements" ? "text-[#d8a355]" : ""
              } ${clickedButton === "/achievements" ? "scale-95 opacity-70" : "hover:scale-105"}`}
            >
              الإنجازات
            </button>
            {(isLoggedIn && userRole === "student") && (
              <>
                <button
                  onClick={() => handleNavClick("/pathways")}
                  className={`hover:text-[#d8a355] transition-all duration-300 ${
                    pathname === "/pathways" ? "text-[#d8a355]" : ""
                  } ${clickedButton === "/pathways" ? "scale-95 opacity-70" : "hover:scale-105"}`}
                >
                  المسار
                </button>
                <button
                  onClick={() => handleNavClick("/daily-challenge")}
                  className={`hover:text-[#d8a355] transition-all duration-300 ${
                    pathname === "/daily-challenge" ? "text-[#d8a355]" : ""
                  } ${clickedButton === "/daily-challenge" ? "scale-95 opacity-70" : "hover:scale-105"}`}
                >
                  التحدي اليومي
                </button>
                <button
                  onClick={() => handleNavClick("/store")}
                  className={`hover:text-[#d8a355] transition-all duration-300 ${
                    pathname === "/store" ? "text-[#d8a355]" : ""
                  } ${clickedButton === "/store" ? "scale-95 opacity-70" : "hover:scale-105"}`}
                >
                  المتجر
                </button>
              </>
            )}
            {isLoggedIn && (userRole === "teacher" || userRole === "admin") && (
              <button
                onClick={() => handleNavClick("/competitions")}
                className={`hover:text-[#d8a355] transition-all duration-300 ${
                  pathname === "/competitions" ? "text-[#d8a355]" : ""
                } ${clickedButton === "/competitions" ? "scale-95 opacity-70" : "hover:scale-105"}`}
              >
                المسابقات
              </button>
            )}
            <button
              onClick={() => handleNavClick("/contact")}
              className={`hover:text-[#d8a355] transition-all duration-300 ${
                pathname === "/contact" ? "text-[#d8a355]" : ""
              } ${clickedButton === "/contact" ? "scale-95 opacity-70" : "hover:scale-105"}`}
            >
              تواصل معنا
            </button>
            <div
              className="relative"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button className="flex items-center gap-1 hover:text-[#d8a355] transition-all duration-300 hover:scale-105">
                أفضل الطلاب
                <ChevronDown className="w-5 h-5" />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-[#faf9f6] text-[#1a2332] rounded-lg shadow-lg py-2 min-w-[220px] z-[60]">
                  <button
                    onClick={() => handleNavClick("/students/all")}
                    className="block w-full text-right px-5 py-3 text-base hover:bg-[#f5f1e8] hover:text-[#d8a355] transition-all duration-200 hover:translate-x-1 font-bold border-b border-[#d8a355]/20"
                  >
                    جميع الطلاب
                  </button>
                  {circlesLoading ? (
                    <div className="px-5 py-3 text-base text-[#1a2332]/50">جاري التحميل...</div>
                  ) : circles.length > 0 ? (
                    circles.map((circle) => (
                      <button
                        key={circle.name}
                        onClick={() => handleNavClick(`/halaqat/${encodeURIComponent(circle.name)}`)}
                        className="block w-full text-right px-5 py-3 text-base hover:bg-[#f5f1e8] hover:text-[#d8a355] transition-all duration-200 hover:translate-x-1"
                      >
                        {circle.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-3 text-base text-[#1a2332]/50">لا توجد حلقات</div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop login/profile */}
          <div className="hidden md:block">
            {isLoggedIn ? (
              <DropdownMenu open={isDesktopProfileDropdownOpen} onOpenChange={setIsDesktopProfileDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-[#d8a355] flex items-center justify-center cursor-pointer ring-2 ring-[#d8a355] ring-offset-2 ring-offset-[#00312e] hover:ring-offset-4 transition-all duration-300 ${
                        isDesktopProfileDropdownOpen ? "scale-110 rotate-6" : "hover:scale-105"
                      }`}
                    >
                      <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-[#00312e]" strokeWidth={2.5} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
                >
                  <DropdownMenuItem
                    onClick={handleProfileClick}
                    className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                  >
                    <User className="w-5 h-5 ml-2" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  {userRole === "admin" ? (
                    <DropdownMenuItem
                      onClick={() => handleDropdownNavClick("/admin/dashboard")}
                      className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                    >
                      <LayoutDashboard className="w-5 h-5 ml-2" />
                      لوحة التحكم
                    </DropdownMenuItem>
                  ) : userRole === "teacher" ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleDropdownNavClick("/teacher/halaqah/1")}
                        className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                      >
                        <Users className="w-5 h-5 ml-2" />
                        إدارة الحلقة
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleOpenAttendanceModal}
                        className="cursor-pointer text-base py-3 focus:bg-[#f5f1e8] focus:text-[#d8a355] transition-all duration-200"
                      >
                        <ClipboardCheck className="w-5 h-5 ml-2" />
                        التحضير
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-base py-3 text-red-600 focus:bg-red-50 focus:text-red-700 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => {
                  scrollToTop()
                  router.push("/login")
                }}
                className="bg-gradient-to-r from-[#d8a355] to-[#c99347] hover:from-[#c99347] hover:to-[#b88341] text-[#00312e] font-bold px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm md:text-base lg:text-lg"
              >
                تسجيل الدخول
              </Button>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-[#d8a355]/20 animate-in slide-in-from-top-2 duration-200 bg-white text-[#1a2332] rounded-b-lg -mx-3 px-3 shadow-lg">
            <nav className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => {
                  handleNavClick("/")
                  setIsMobileMenuOpen(false)
                }}
                className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                  pathname === "/" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                }`}
              >
                الرئيسية
              </button>
              <button
                onClick={() => {
                  handleNavClick("/achievements")
                  setIsMobileMenuOpen(false)
                }}
                className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                  pathname === "/achievements" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                }`}
              >
                الإنجازات
              </button>
              {(isLoggedIn && (userRole === "student" || userRole === "admin")) && (
                <>
                  <button
                    onClick={() => {
                      handleNavClick("/pathways")
                      setIsMobileMenuOpen(false)
                    }}
                    className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                      pathname === "/pathways" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                    }`}
                  >
                    المسار
                  </button>
                  {userRole === "student" && (
                    <>
                      <button
                        onClick={() => {
                          handleNavClick("/daily-challenge")
                          setIsMobileMenuOpen(false)
                        }}
                        className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                          pathname === "/daily-challenge" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                        }`}
                      >
                        التحدي اليومي
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick("/store")
                          setIsMobileMenuOpen(false)
                        }}
                        className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                          pathname === "/store" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                        }`}
                      >
                        المتجر
                      </button>
                    </>
                  )}
                </>
              )}
              {isLoggedIn && (userRole === "teacher" || userRole === "admin") && (
                <button
                  onClick={() => {
                    handleNavClick("/competitions")
                    setIsMobileMenuOpen(false)
                  }}
                  className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                    pathname === "/competitions" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                  }`}
                >
                  المسابقات
                </button>
              )}
              <button
                onClick={() => {
                  handleNavClick("/contact")
                  setIsMobileMenuOpen(false)
                }}
                className={`text-right px-4 py-3 rounded-lg hover:bg-[#f5f1e8] transition-colors ${
                  pathname === "/contact" ? "bg-[#f5f1e8] text-[#d8a355]" : ""
                }`}
              >
                تواصل معنا
              </button>
              <div className="px-4">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-full py-3 hover:text-[#d8a355] transition-colors"
                >
                  <span>أفضل الطلاب</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isDropdownOpen && (
                  <div className="mt-2 space-y-2 pr-4">
                    <button
                      onClick={() => {
                        handleNavClick("/students/all")
                        setIsMobileMenuOpen(false)
                        setIsDropdownOpen(false)
                      }}
                      className="block w-full text-right py-2 px-3 rounded-lg hover:bg-[#f5f1e8] hover:text-[#d8a355] transition-colors text-sm font-bold border-b border-[#d8a355]/20 mb-2"
                    >
                      جميع الطلاب
                    </button>
                    {circlesLoading ? (
                      <div className="py-2 text-sm text-[#1a2332]/50">جاري التحميل...</div>
                    ) : circles.length > 0 ? (
                      circles.map((circle) => (
                        <button
                          key={circle.name}
                          onClick={() => {
                            handleNavClick(`/halaqat/${encodeURIComponent(circle.name)}`)
                            setIsMobileMenuOpen(false)
                            setIsDropdownOpen(false)
                          }}
                          className="block w-full text-right py-2 px-3 rounded-lg hover:bg-[#f5f1e8] hover:text-[#d8a355] transition-colors text-sm"
                        >
                          {circle.name}
                        </button>
                      ))
                    ) : (
                      <div className="py-2 text-sm text-[#1a2332]/50">لا توجد حلقات</div>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
