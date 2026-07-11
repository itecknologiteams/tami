import 'package:flutter/material.dart';

import '../rider_chat_client.dart';

class RideChatSheet extends StatefulWidget {
  const RideChatSheet({
    required this.accessToken,
    required this.rideId,
    required this.chatClient,
    super.key,
  });

  final String accessToken;
  final String rideId;
  final RiderChatClient chatClient;

  @override
  State<RideChatSheet> createState() => _RideChatSheetState();
}

class _RideChatSheetState extends State<RideChatSheet> {
  final _messageController = TextEditingController();
  List<RiderChatMessage> _messages = const [];
  String? _error;
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await widget.chatClient.listMessages(
        accessToken: widget.accessToken,
        rideId: widget.rideId,
      );
      if (mounted) {
        setState(() => _messages = messages);
      }
    } on RiderChatException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _sendMessage() async {
    final body = _messageController.text.trim();
    if (body.isEmpty || _isSending) {
      return;
    }
    setState(() => _isSending = true);
    try {
      final message = await widget.chatClient.sendMessage(
        accessToken: widget.accessToken,
        rideId: widget.rideId,
        message: body,
      );
      if (mounted) {
        setState(() {
          _messages = [..._messages, message];
          _messageController.clear();
        });
      }
    } on RiderChatException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Material(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              children: [
                Container(width: 42, height: 4, color: const Color(0xFFD5E2DC)),
                const SizedBox(height: 18),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Chat with driver',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ListView.separated(
                          itemCount: _messages.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final message = _messages[index];
                            final isRider = message.senderType == 'rider';
                            return Align(
                              alignment: isRider
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                color: isRider
                                    ? const Color(0xFFE4EFEA)
                                    : const Color(0xFFF2F5F3),
                                child: Text(message.body),
                              ),
                            );
                          },
                        ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Color(0xFFB42318)),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        key: const Key('chat-input'),
                        controller: _messageController,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                        decoration: const InputDecoration(
                          hintText: 'Message driver',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(8)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      key: const Key('send-chat'),
                      tooltip: 'Send message',
                      onPressed: _isSending ? null : _sendMessage,
                      icon: const Icon(Icons.send),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
