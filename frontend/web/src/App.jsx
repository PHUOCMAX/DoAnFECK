import { LANGUAGES } from "@shared/constants/languages";
import { INITIAL_POIS } from "@shared/constants/initialPois";

function App() {
  return (
    <div>
      <h1>Multilingual Tour Guide</h1>

      <h2>Languages</h2>

      {LANGUAGES.map((language) => (
        <p key={language.code}>
          {language.code} - {language.name}
        </p>
      ))}

      <h2>POI</h2>

      {INITIAL_POIS.map((poi) => (
        <div key={poi.id}>
          <p>{poi.name.vi}</p>
          <p>{poi.description.vi}</p>
          <p>
            GPS: {poi.latitude}, {poi.longitude}
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;