import 'package:flutter/material.dart';

import '../../../ui/tami_colors.dart';
import '../../../auth/rider_session.dart';
import '../rider_ride_query_client.dart';
import 'rider_ride_detail_screen.dart';

class RiderTripsScreen extends StatefulWidget {
  const RiderTripsScreen({this.session, this.rideQueryClient, super.key});

  final RiderSession? session;
  final RiderRideQueryClient? rideQueryClient;

  @override
  State<RiderTripsScreen> createState() => _RiderTripsScreenState();
}

class _RiderTripsScreenState extends State<RiderTripsScreen> {
  late Future<({List<RiderRide> upcoming, RiderRidePage history})>? _rides;

  @override
  void initState() {
    super.initState();
    _rides = _load();
  }

  Future<({List<RiderRide> upcoming, RiderRidePage history})>? _load() {
    final client = widget.rideQueryClient;
    final session = widget.session;
    if (client == null || session == null) {
      return null;
    }
    return Future.wait([
      client.getUpcomingRides(accessToken: session.accessToken),
      client.getRideHistory(accessToken: session.accessToken),
    ]).then(
      (results) => (
        upcoming: results[0] as List<RiderRide>,
        history: results[1] as RiderRidePage,
      ),
    );
  }

  void _retry() => setState(() => _rides = _load());

  void _openRide(RiderRide ride) {
    final client = widget.rideQueryClient;
    final session = widget.session;
    if (client == null || session == null) {
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RiderRideDetailScreen(
          session: session,
          rideQueryClient: client,
          rideId: ride.id,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your trips')),
      body: _rides == null
          ? const _TripsContent(upcoming: [], history: [], onRideTap: null)
          : FutureBuilder<({List<RiderRide> upcoming, RiderRidePage history})>(
              future: _rides,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Trips could not be loaded'),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _retry,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try again'),
                        ),
                      ],
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                return _TripsContent(
                  upcoming: snapshot.data!.upcoming,
                  history: snapshot.data!.history.items,
                  onRideTap: _openRide,
                );
              },
            ),
    );
  }
}

class _TripsContent extends StatelessWidget {
  const _TripsContent({
    required this.upcoming,
    required this.history,
    required this.onRideTap,
  });

  final List<RiderRide> upcoming;
  final List<RiderRide> history;
  final ValueChanged<RiderRide>? onRideTap;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      children: [
        const Text(
          'Upcoming',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        if (upcoming.isEmpty)
          const Text(
            'No scheduled rides',
            style: TextStyle(color: TamiColors.mutedInk),
          )
        else
          ...upcoming.map(
            (ride) => _RideRow(
              ride: ride,
              scheduled: true,
              onTap: onRideTap == null ? null : () => onRideTap!(ride),
            ),
          ),
        const Divider(height: 40),
        const Text(
          'Past trips',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        if (history.isEmpty)
          const Text(
            'Completed rides will appear here.',
            style: TextStyle(color: TamiColors.mutedInk),
          )
        else
          ...history.map(
            (ride) => _RideRow(
              ride: ride,
              scheduled: false,
              onTap: onRideTap == null ? null : () => onRideTap!(ride),
            ),
          ),
      ],
    );
  }
}

class _RideRow extends StatelessWidget {
  const _RideRow({
    required this.ride,
    required this.scheduled,
    required this.onTap,
  });

  final RiderRide ride;
  final bool scheduled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final timestamp = DateTime.tryParse(
      scheduled ? ride.scheduledPickupAt ?? ride.requestedAt : ride.requestedAt,
    )?.toLocal();
    final date = timestamp == null
        ? null
        : '${timestamp.day.toString().padLeft(2, '0')}/'
              '${timestamp.month.toString().padLeft(2, '0')}/${timestamp.year} '
              '${timestamp.hour.toString().padLeft(2, '0')}:'
              '${timestamp.minute.toString().padLeft(2, '0')}';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        scheduled ? Icons.calendar_month_outlined : Icons.route_outlined,
        color: TamiColors.civicGreen,
      ),
      title: Text(
        ride.destination.address,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w700),
      ),
      subtitle: Text(date ?? ride.state.replaceAll('_', ' ')),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
