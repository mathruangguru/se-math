import { ArrowLeft } from "lucide-react";
import CourseSection from "../components/course/CourseSection";
import { course } from "../data/course";

export default function CourseDetailPage() {
  const visibleSections = course.sections.filter(
    (s) => (s.items?.length ?? 0) > 0
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      {/* Header */}
      <div>
        <button className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
          <ArrowLeft size={14} /> Semua Course
        </button>

        <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-900">
          {course.title}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {course.description}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {visibleSections.map((section) => (
          <CourseSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
