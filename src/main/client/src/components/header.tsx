import { useRef } from "react";
import { Link } from "react-router-dom";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";

export default function Header() {
  const op = useRef<OverlayPanel>(null);

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 w-full flex justify-between items-center z-20">
      <Link to="/courseflow" className="flex items-center gap-2 ml-2 mt-2 mb-2">
        <img src="/logo.png" alt="CourseFlow Logo" className="w-[200px]" />
      </Link>

      <div className="relative mr-6">
        <Button
          className="text-gray-800! hover:text-red-600! focus:text-red-600! transition duration-200 cursor-pointer p-2! rounded-full!"
          icon="pi pi-user"
          size="large"
          text={true}
          onClick={(e) => op.current?.toggle(e)}
        ></Button>

        <OverlayPanel ref={op} className="w-35">
          <Link
            to="/profile"
            className="block text-gray-800 hover:text-red-600 transition duration-200"
          >
            <i className="pi pi-id-card"></i> Account
          </Link>
          <Link
            to="/settings"
            className="block text-gray-800 hover:text-red-600 transition duration-200 mt-2"
          >
            <i className="pi pi-cog"></i> Settings
          </Link>
          <Link
            to="/login"
            className="block text-gray-800 hover:text-red-600 transition duration-200 mt-2"
          >
            <i className="pi pi-sign-in"></i> Login
          </Link>
        </OverlayPanel>
      </div>
    </header>
  );
}
