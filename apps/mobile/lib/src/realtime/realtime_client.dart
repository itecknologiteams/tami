import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as socket_io;

/// A live connection to one of the API's realtime namespaces (`/rider` or
/// `/driver`). Abstracted so widgets can be tested with a fake stream source
/// instead of a real socket.
abstract class RealtimeClient {
  void connect();
  Stream<T> on<T>(String event);
  bool get isConnected;
  void dispose();
}

/// Real socket.io-backed implementation. Reconnects automatically with
/// socket.io's built-in backoff.
class SocketIoRealtimeClient implements RealtimeClient {
  SocketIoRealtimeClient({
    required String baseUrl,
    required String namespace,
    required String accessToken,
  }) : _socket = socket_io.io(
         '$baseUrl$namespace',
         socket_io.OptionBuilder()
             .setTransports(['websocket'])
             .setAuth({'token': accessToken})
             .enableReconnection()
             .build(),
       );

  final socket_io.Socket _socket;
  final Map<String, StreamController<dynamic>> _controllers = {};

  @override
  void connect() {
    _socket.connect();
  }

  @override
  Stream<T> on<T>(String event) {
    final controller = _controllers.putIfAbsent(
      event,
      () {
        final controller = StreamController<dynamic>.broadcast();
        _socket.on(event, controller.add);
        return controller;
      },
    );
    return controller.stream.cast<T>();
  }

  @override
  bool get isConnected => _socket.connected;

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.close();
    }
    _controllers.clear();
    _socket.dispose();
  }
}
