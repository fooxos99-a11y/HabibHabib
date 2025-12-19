import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { student_id, level_number } = body;

    if (!student_id || !level_number) {
      return NextResponse.json({ error: "student_id و level_number مطلوبان" }, { status: 400 });
    }

    // تحقق إذا كان السجل موجود مسبقاً
    const { data: existing, error: fetchError } = await supabase
      .from("pathway_level_completions")
      .select("id")
      .eq("student_id", student_id)
      .eq("level_number", level_number)
      .maybeSingle();

    if (existing && existing.id) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    // جلب حالة خصم النصف من pathway_levels
    const { data: levelData, error: levelError } = await supabase
      .from("pathway_levels")
      .select("id, points, half_points_applied")
      .eq("level_number", level_number)
      .maybeSingle();

    if (levelError || !levelData) {
      return NextResponse.json({ error: "تعذر جلب بيانات المستوى" }, { status: 500 });
    }

    // تحديد النقاط
    let points = 100;
    if (typeof levelData.points === 'number') points = levelData.points;
    if (levelData.half_points_applied) points = Math.floor(points / 2);

    // أضف السجل مع النقاط
    console.log("[COMPLETE-LEVEL API] Trying to insert:", { student_id, level_number, points });
    const { data, error } = await supabase
      .from("pathway_level_completions")
      .insert({ student_id, level_number, points })
      .select()
      .single();

    if (error) {
      console.error("[COMPLETE-LEVEL API] Insert error:", error);
      return NextResponse.json({ error: error.message || "فشل في إضافة سجل الإكمال" }, { status: 500 });
    }

    return NextResponse.json({ success: true, completion: data, points });
  } catch (error) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
