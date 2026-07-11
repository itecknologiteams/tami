# Tami Mobile

Flutter application for the rider app on Android and iOS, and the Android driver infotainment app.

## Entry Points

```bash
flutter run --target lib/main_rider.dart
flutter run --target lib/main_driver.dart
```

## Rider Browser Preview

The browser target is a development preview. It deliberately uses a painted static map fallback so it does not introduce `maplibre-gl-js`; Android and iOS use the MapLibre Flutter package.

Start the API and then build the rider preview with a browser-reachable API host:

```bash
flutter build web --target lib/main_rider.dart \
  --dart-define=TAMI_API_BASE_URL=http://127.0.0.1:4000
python3 -m http.server 4174 --directory build/web
```

Use `TAMI_MAP_STYLE_URL` to provide the approved public `streets-v2` style endpoint for native mobile builds.

## Checks

```bash
flutter test
flutter analyze
```
