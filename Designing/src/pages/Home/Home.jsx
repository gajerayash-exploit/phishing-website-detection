import Hero from '../../components/Hero/Hero';
import Features from '../../components/Features/Features';
import Timeline from '../../components/Timeline/Timeline';

const Home = () => {
  return (
    <div className="home-page">
      <Hero />
      <Features />
      <Timeline />
    </div>
  );
};

export default Home;
