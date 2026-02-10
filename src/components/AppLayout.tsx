import { Outlet } from "react-router-dom";
import MobileNav from "./MobileNav";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background safe-top">
      <main className="pb-20">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
