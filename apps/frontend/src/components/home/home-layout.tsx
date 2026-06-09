import HomeHero from "./home-hero";
import SideNav from "./side-nav";

const HomeLayout = () => {
  return (
    <section className="flex h-screen overflow-hidden bg-black">
      <SideNav variant="dark" showGuestCard={false} />
      <HomeHero />
    </section>
  );
};

export default HomeLayout;
