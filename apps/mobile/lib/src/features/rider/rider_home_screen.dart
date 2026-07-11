import 'package:flutter/material.dart';

import '../../auth/rider_session.dart';
import '../../maps/tami_map_surface.dart';
import 'rider_booking_client.dart';
import 'rider_chat_client.dart';

class RiderHomeScreen extends StatefulWidget {
  const RiderHomeScreen({
    this.mapSurface,
    this.session,
    this.bookingClient,
    this.chatClient,
    this.initialRide,
    this.initialDestination,
    super.key,
  }) : assert(initialRide == null || initialDestination != null);

  final Widget? mapSurface;
  final RiderSession? session;
  final RiderBookingClient? bookingClient;
  final RiderChatClient? chatClient;
  final RiderBookingRide? initialRide;
  final TamiPlace? initialDestination;

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  TamiPlace? _destination;
  RiderBookingRide? _activeRide;

  @override
  void initState() {
    super.initState();
    _destination = widget.initialDestination;
    _activeRide = widget.initialRide;
  }

  Future<void> _openDestinationSearch() async {
    final destination = await showModalBottomSheet<TamiPlace>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _DestinationSearchSheet(),
    );
    if (!mounted || destination == null) {
      return;
    }

    setState(() => _destination = destination);
    _openRideOptions(destination);
  }

  void _openRideOptions(TamiPlace destination) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _RideOptionsSheet(
        destination: destination,
        onConfirm: _requestRide,
      ),
    );
  }

  Future<void> _requestRide(_RideSelection selection) async {
    final bookingClient = widget.bookingClient;
    final session = widget.session;
    if (bookingClient == null || session == null) {
      throw const RiderBookingException('Sign in to request a ride.');
    }

    final ride = await bookingClient.createRide(
      accessToken: session.accessToken,
      request: CreateRiderRideRequest(
        categoryCode: selection.categoryCode,
        pickup: const RiderCoordinates(
          latitude: 24.8607,
          longitude: 67.0011,
          address: 'Frere Hall, Karachi',
        ),
        destination: RiderCoordinates(
          latitude: selection.destination.latitude,
          longitude: selection.destination.longitude,
          address: selection.destination.address,
        ),
        scheduledPickupAt: selection.scheduledPickupAt,
      ),
    );
    if (mounted) {
      setState(() => _activeRide = ride);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: RepaintBoundary(
              key: const Key('rider-map'),
              child: widget.mapSurface ?? const TamiMapSurface(),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                children: [
                  Row(
                    children: [
                      const _CityPill(),
                      const Spacer(),
                      Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        child: IconButton(
                          tooltip: 'Safety center',
                          onPressed: () {},
                          icon: const Icon(Icons.shield_outlined),
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  if (_activeRide == null)
                    _BookingComposer(
                      destination: _destination,
                      onDestinationTap: _openDestinationSearch,
                    )
                  else
                    _RideSearchPanel(
                      destination: _destination!,
                      rideState: _activeRide!.state,
                      onCancel: _confirmCancelRide,
                      onChat: widget.chatClient == null ? null : _openChat,
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmCancelRide() async {
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel this ride?'),
        content: const Text('This will stop the current driver search.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep ride'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancel ride'),
          ),
        ],
      ),
    );
    if (shouldCancel != true) {
      return;
    }

    final bookingClient = widget.bookingClient;
    final session = widget.session;
    final activeRide = _activeRide;
    if (bookingClient == null || session == null || activeRide == null) {
      return;
    }
    try {
      await bookingClient.cancelRide(
        accessToken: session.accessToken,
        rideId: activeRide.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _activeRide = null;
        _destination = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ride cancelled')),
      );
    } on RiderBookingException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    }
  }

  Future<void> _openChat() async {
    final chatClient = widget.chatClient;
    final session = widget.session;
    final activeRide = _activeRide;
    if (chatClient == null || session == null || activeRide == null) {
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _RideChatSheet(
        accessToken: session.accessToken,
        rideId: activeRide.id,
        chatClient: chatClient,
      ),
    );
  }
}

class _CityPill extends StatelessWidget {
  const _CityPill();

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.location_city_outlined, size: 18),
            SizedBox(width: 8),
            Text('Karachi', style: TextStyle(fontWeight: FontWeight.w700)),
            SizedBox(width: 4),
            Icon(Icons.expand_more, size: 18),
          ],
        ),
      ),
    );
  }
}

class _BookingComposer extends StatelessWidget {
  const _BookingComposer({
    required this.destination,
    required this.onDestinationTap,
  });

  final TamiPlace? destination;
  final VoidCallback onDestinationTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 12,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD5E2DC),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const _LocationRow(
              icon: Icons.my_location,
              title: 'Current location',
              subtitle: 'Use your pickup point',
              accent: Color(0xFF006C5B),
            ),
            const Divider(height: 24),
            InkWell(
              key: const Key('destination-trigger'),
              onTap: onDestinationTap,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: _LocationRow(
                  icon: Icons.search,
                  title: destination?.name ?? 'Where to?',
                  subtitle: destination?.address ??
                      'Search a place or choose a saved address',
                  accent: Color(0xFFF2BC3D),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RideSearchPanel extends StatelessWidget {
  const _RideSearchPanel({
    required this.destination,
    required this.rideState,
    required this.onCancel,
    required this.onChat,
  });

  final TamiPlace destination;
  final String rideState;
  final VoidCallback onCancel;
  final VoidCallback? onChat;

  bool get _chatAvailable => {
    'accepted',
    'driver_en_route_to_pickup',
    'arrived_at_pickup',
    'rider_onboarded',
    'in_progress',
    'arrived_at_destination',
    'payment_pending',
  }.contains(rideState);

  String get _heading {
    return switch (rideState) {
      'accepted' => 'Driver accepted your ride',
      'driver_en_route_to_pickup' => 'Driver is on the way',
      'arrived_at_pickup' => 'Driver has arrived',
      'rider_onboarded' || 'in_progress' => 'Ride in progress',
      'arrived_at_destination' => 'Arrived at destination',
      'payment_pending' => 'Payment pending',
      _ => 'Finding your driver',
    };
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 12,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _chatAvailable ? Icons.local_taxi_outlined : Icons.radar_outlined,
                  color: const Color(0xFF006C5B),
                ),
                const SizedBox(width: 10),
                Text(
                  _heading,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Ride requested to ${destination.name}',
              style: const TextStyle(color: Color(0xFF55716A)),
            ),
            const SizedBox(height: 14),
            if (!_chatAvailable)
              const LinearProgressIndicator(color: Color(0xFFF2BC3D)),
            const SizedBox(height: 16),
            if (_chatAvailable)
              OutlinedButton.icon(
                onPressed: onChat,
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Chat with driver'),
              ),
            if (_chatAvailable) const SizedBox(height: 8),
            OutlinedButton(
              onPressed: onCancel,
              child: const Text('Cancel ride'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RideChatSheet extends StatefulWidget {
  const _RideChatSheet({
    required this.accessToken,
    required this.rideId,
    required this.chatClient,
  });

  final String accessToken;
  final String rideId;
  final RiderChatClient chatClient;

  @override
  State<_RideChatSheet> createState() => _RideChatSheetState();
}

class _RideChatSheetState extends State<_RideChatSheet> {
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

class _LocationRow extends StatelessWidget {
  const _LocationRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          child: Icon(icon, color: const Color(0xFF18302B), size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(color: Color(0xFF55716A), fontSize: 13),
              ),
            ],
          ),
        ),
        const Icon(Icons.chevron_right),
      ],
    );
  }
}

class TamiPlace {
  const TamiPlace({
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  final String name;
  final String address;
  final double latitude;
  final double longitude;
}

const _destinationOptions = [
  TamiPlace(
    name: 'Mazar-e-Quaid',
    address: 'Mazar-e-Quaid, Karachi',
    latitude: 24.8753,
    longitude: 67.0407,
  ),
  TamiPlace(
    name: 'Frere Hall',
    address: 'Civil Lines, Karachi',
    latitude: 24.8468,
    longitude: 67.0303,
  ),
  TamiPlace(
    name: 'Clifton Beach',
    address: 'Clifton, Karachi',
    latitude: 24.8138,
    longitude: 67.0307,
  ),
  TamiPlace(
    name: 'Hyderabad Railway Station',
    address: 'Hyderabad, Sindh',
    latitude: 25.3791,
    longitude: 68.3728,
  ),
];

class _DestinationSearchSheet extends StatefulWidget {
  const _DestinationSearchSheet();

  @override
  State<_DestinationSearchSheet> createState() =>
      _DestinationSearchSheetState();
}

class _DestinationSearchSheetState extends State<_DestinationSearchSheet> {
  String _query = '';

  List<TamiPlace> get _matchingDestinations {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) {
      return const [];
    }
    return _destinationOptions
        .where(
          (place) =>
              place.name.toLowerCase().contains(query) ||
              place.address.toLowerCase().contains(query),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Material(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 42,
                height: 4,
                color: const Color(0xFFD5E2DC),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  IconButton(
                    tooltip: 'Close destination search',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Choose destination',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                key: Key('destination-search'),
                autofocus: true,
                onChanged: (value) => setState(() => _query = value),
                decoration: InputDecoration(
                  hintText: 'Search destination',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                ),
              ),
              if (_query.isEmpty) ...[
                const SizedBox(height: 24),
                const _SavedPlaceRow(
                  icon: Icons.home_outlined,
                  title: 'Home',
                  subtitle: 'Save an address for faster booking',
                ),
                const SizedBox(height: 12),
                const _SavedPlaceRow(
                  icon: Icons.business_center_outlined,
                  title: 'Work',
                  subtitle: 'Save an address for faster booking',
                ),
              ] else ...[
                const SizedBox(height: 18),
                for (final place in _matchingDestinations)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(
                      Icons.location_on_outlined,
                      color: Color(0xFF006C5B),
                    ),
                    title: Text(
                      place.name,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(place.address),
                    onTap: () => Navigator.of(context).pop(place),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

enum _RideCategory { standard, womenFamily, airport, accessible }

enum _PaymentMethod { cash, jazzCash, easypaisa, nayapay }

class _RideSelection {
  const _RideSelection({
    required this.destination,
    required this.categoryCode,
    required this.paymentMethod,
    required this.scheduledPickupAt,
  });

  final TamiPlace destination;
  final String categoryCode;
  final _PaymentMethod paymentMethod;
  final DateTime? scheduledPickupAt;
}

class _RideOptionsSheet extends StatefulWidget {
  const _RideOptionsSheet({
    required this.destination,
    required this.onConfirm,
  });

  final TamiPlace destination;
  final Future<void> Function(_RideSelection selection) onConfirm;

  @override
  State<_RideOptionsSheet> createState() => _RideOptionsSheetState();
}

class _RideOptionsSheetState extends State<_RideOptionsSheet> {
  _RideCategory _category = _RideCategory.standard;
  _PaymentMethod _paymentMethod = _PaymentMethod.cash;
  bool _isScheduled = false;
  bool _isSubmitting = false;
  String? _error;
  DateTime? _scheduledPickupAt;

  int get _estimate {
    return switch (_category) {
      _RideCategory.standard => 460,
      _RideCategory.womenFamily => 500,
      _RideCategory.airport => 760,
      _RideCategory.accessible => 540,
    };
  }

  Future<void> _confirm() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.onConfirm(
        _RideSelection(
          destination: widget.destination,
          categoryCode: _isScheduled ? 'scheduled_ride' : _categoryCode(_category),
          paymentMethod: _paymentMethod,
          scheduledPickupAt: _isScheduled ? _scheduledPickupAt : null,
        ),
      );
      if (mounted) {
        Navigator.of(context).pop();
      }
    } on RiderBookingException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Unable to request your ride. Try again.');
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _pickScheduledPickup() async {
    final now = DateTime.now();
    final initial = _scheduledPickupAt ?? now.add(const Duration(hours: 1));
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 90)),
    );
    if (!mounted || date == null) {
      return;
    }

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (!mounted || time == null) {
      return;
    }
    setState(() {
      _scheduledPickupAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  String _scheduledPickupLabel() {
    final pickupAt = _scheduledPickupAt;
    if (pickupAt == null) {
      return 'Pick a date and time';
    }
    final hour = pickupAt.hour % 12 == 0 ? 12 : pickupAt.hour % 12;
    final minute = pickupAt.minute.toString().padLeft(2, '0');
    final period = pickupAt.hour < 12 ? 'AM' : 'PM';
    return '${pickupAt.day}/${pickupAt.month}/${pickupAt.year}, $hour:$minute $period';
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Material(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    color: const Color(0xFFD5E2DC),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Choose a ride',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.destination.name,
                  style: const TextStyle(color: Color(0xFF55716A)),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _RideCategory.values
                      .map(
                        (category) => ChoiceChip(
                          label: Text(_categoryLabel(category)),
                          selected: _category == category,
                          onSelected: (_) => setState(() => _category = category),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 20),
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: false, label: Text('Now')),
                    ButtonSegment(value: true, label: Text('Later')),
                  ],
                  selected: {_isScheduled},
                  onSelectionChanged: (value) {
                    setState(() {
                      _isScheduled = value.first;
                      if (_isScheduled && _scheduledPickupAt == null) {
                        _scheduledPickupAt = DateTime.now().add(
                          const Duration(hours: 1),
                        );
                      }
                    });
                  },
                ),
                if (_isScheduled) ...[
                  const SizedBox(height: 12),
                  ListTile(
                    key: const Key('schedule-picker'),
                    onTap: _pickScheduledPickup,
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.schedule),
                    title: const Text('Schedule pickup'),
                    subtitle: Text(_scheduledPickupLabel()),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                ],
                const SizedBox(height: 20),
                DropdownButtonFormField<_PaymentMethod>(
                  initialValue: _paymentMethod,
                  decoration: const InputDecoration(
                    labelText: 'Payment method',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(8)),
                    ),
                  ),
                  items: _PaymentMethod.values
                      .map(
                        (method) => DropdownMenuItem(
                          value: method,
                          child: Text(_paymentLabel(method)),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _paymentMethod = value);
                    }
                  },
                ),
                const SizedBox(height: 20),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: const Color(0xFFE4EFEA),
                  child: Row(
                    children: [
                      const Icon(Icons.receipt_long_outlined),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Estimated fare'),
                            Text(
                              'PKR $_estimate',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Text('Government fare policy'),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                if (_error != null) ...[
                  Text(
                    _error!,
                    style: const TextStyle(color: Color(0xFFB42318)),
                  ),
                  const SizedBox(height: 12),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _confirm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006C5B),
                      foregroundColor: Colors.white,
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                      ),
                    ),
                    child: Text(_isSubmitting ? 'Requesting ride' : 'Confirm ride'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _categoryLabel(_RideCategory category) {
    return switch (category) {
      _RideCategory.standard => 'Standard Taxi',
      _RideCategory.womenFamily => 'Women/Family',
      _RideCategory.airport => 'Airport',
      _RideCategory.accessible => 'Accessible',
    };
  }

  String _categoryCode(_RideCategory category) {
    return switch (category) {
      _RideCategory.standard => 'standard_taxi',
      _RideCategory.womenFamily => 'women_family_preferred',
      _RideCategory.airport => 'airport',
      _RideCategory.accessible => 'accessible_special_assistance',
    };
  }

  String _paymentLabel(_PaymentMethod method) {
    return switch (method) {
      _PaymentMethod.cash => 'Cash',
      _PaymentMethod.jazzCash => 'JazzCash',
      _PaymentMethod.easypaisa => 'Easypaisa',
      _PaymentMethod.nayapay => 'NayaPay',
    };
  }
}

class _SavedPlaceRow extends StatelessWidget {
  const _SavedPlaceRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: const Color(0xFF006C5B)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.add),
    );
  }
}
