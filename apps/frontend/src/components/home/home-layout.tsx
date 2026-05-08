import HomeHero from "./home-hero";
import SideNav from "./side-nav";

const HomeLayout = () => {
  return (
    <section className="flex h-screen overflow-hidden bg-[#050808]">
      <SideNav />
      <HomeHero />
    </section>
  );
};

export default HomeLayout;
