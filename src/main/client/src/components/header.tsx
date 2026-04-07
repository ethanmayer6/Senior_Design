import { useRef } from "react";
import { Link } from "react-router-dom";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";

export default function Header() {
  const op = useRef<OverlayPanel>(null);

  return (
    <header className="fixed left-0 top-0 z-20 flex h-[56px] w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur-sm sm:px-4">
      <Link to="/courseflow" className="flex items-center gap-2">
        <img src="/logo.png" alt="CourseFlow Logo" className="w-[148px] sm:w-[158px]" />
      </Link>

      <div className="relative">
        <Button
          className="cursor-pointer rounded-full! p-1.5! text-gray-800! transition duration-200 hover:text-red-600! focus:text-red-600!"
          icon="pi pi-user"
          text={true}
          onClick={(e) => op.current?.toggle(e)}
        ></Button>

        <OverlayPanel ref={op} className="w-35">
          <Link
            to="/profile"
            className="block text-gray-800 hover:text-red-600 transition duration-200"
          >
            <i className="pi pi-id-card"></i> Profile
          </Link>
        </OverlayPanel>
      </div>
    </header>
  );
}
