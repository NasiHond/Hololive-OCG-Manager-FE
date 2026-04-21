import Navbar from "../components/Navbar";
import "./css/home.css"

export default function Home() {
  return (
      <div className="home-layout">
        <Navbar activeItem="dashboard" />
        <div className="home-content">
            <h1>a search bar of all time</h1>
            <button>Create Deck</button>
            <h1>This will be news one day</h1>
            <h1>Top Ranked Decks</h1>
        </div>
      </div>
  )
}

