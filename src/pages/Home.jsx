import { Link } from 'react-router-dom';
import MyShader from '../Shaders';
import CardCarousel from '../CardCarousel';
import convertorImg from '../IMAGES/Convertor.webp';
import infoImg from '../IMAGES/Info_Doter.webp';
import wildsenImg from '../IMAGES/wildsen_channel_image.jpg';
import djabImg from '../IMAGES/DJAB_channel_image.jpg';
import fixImg from '../IMAGES/FID3_channel_image.jpg';

const tools = [
  { name: 'Info Doter', img: infoImg, to: '/info', label: 'Bug reports' },
  { name: 'Tail Bot', icon: '🐾', to: '/tail-bot', label: 'Project details' },
  { name: 'Convertor', img: convertorImg, label: 'Inactive', disabled: true },
];

const channels = [
  { name: 'Wildsen News', img: wildsenImg, url: 'https://t.me/WildsenNews', label: 'Telegram' },
  { name: 'Djab', img: djabImg, url: 'https://t.me/djab_memes', label: 'Telegram' },
  { name: 'Fix in Dota 3?', img: fixImg, url: 'https://t.me/F_I_D3', label: 'Telegram' },
];

export default function Home() {
  return (
    <div className="hub">
      <main>
        <section className="hero" id="home" aria-labelledby="logo">
          <div className="hero-copy">
            <h1 id="logo">Wildsen</h1>
            <p>Dota 2 tools, bug reports and my Telegram channels.</p>
            <Link className="primary-link" to="/info">Open Info Doter</Link>
          </div>
          <div className="hero-art" aria-hidden="true"><MyShader /></div>
        </section>
        <div className="shelves">
          <section id="tools" aria-labelledby="tools-heading">
            <h2 id="tools-heading">Tools</h2>
            <CardCarousel items={tools} label="Tools" />
          </section>
          <section id="channels" aria-labelledby="channels-heading">
            <h2 id="channels-heading">Channels</h2>
            <CardCarousel items={channels} label="Channels" />
          </section>
        </div>
      </main>
    </div>
  );
}
