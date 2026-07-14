import 'package:flutter/material.dart';

import '../../ui/tami_colors.dart';
import '../../ui/tami_glass.dart';
import 'driver_ride.dart';
import 'driver_ride_client.dart';
import 'driver_session.dart';

class DriverEarningsScreen extends StatefulWidget {
  const DriverEarningsScreen({
    required this.session,
    required this.rideClient,
    super.key,
  });

  final DriverSession session;
  final DriverRideClient rideClient;

  @override
  State<DriverEarningsScreen> createState() => _DriverEarningsScreenState();
}

class _DriverEarningsScreenState extends State<DriverEarningsScreen> {
  DriverEarnings? _earnings;
  List<DriverRide> _history = const [];
  String? _error;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final earnings = await widget.rideClient.getEarnings(
        accessToken: widget.session.accessToken,
      );
      final history = await widget.rideClient.getRideHistory(
        accessToken: widget.session.accessToken,
      );
      if (mounted) {
        setState(() {
          _earnings = earnings;
          _history = history;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Earnings',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              if (_isLoading && _earnings == null)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_error != null)
                Text(
                  _error!,
                  style: const TextStyle(color: TamiColors.danger),
                )
              else if (_earnings != null) ...[
                Row(
                  children: [
                    Expanded(
                      child: _EarningsTile(
                        label: 'Today',
                        window: _earnings!.today,
                        currency: _earnings!.currency,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _EarningsTile(
                        label: 'Last 7 days',
                        window: _earnings!.week,
                        currency: _earnings!.currency,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text(
                  'Finished rides',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                if (_history.isEmpty)
                  const Text('No finished rides yet.')
                else
                  ..._history.map(
                    (ride) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: TamiGlass(
                        semanticLabel: 'Finished ride',
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${ride.pickupAddress} → '
                                    '${ride.destinationAddress}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _stateLabel(ride.state),
                                    style: TextStyle(
                                      color: ride.state == 'completed'
                                          ? TamiColors.civicGreen
                                          : TamiColors.danger,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              _fareLabel(ride),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _fareLabel(DriverRide ride) {
    final amount = ride.finalFareMinor;
    if (amount == null) {
      return '—';
    }
    return '${ride.currency} ${(amount / 100).toStringAsFixed(0)}';
  }

  String _stateLabel(String state) {
    return state.replaceAll('_', ' ');
  }
}

class _EarningsTile extends StatelessWidget {
  const _EarningsTile({
    required this.label,
    required this.window,
    required this.currency,
  });

  final String label;
  final DriverEarningsWindow window;
  final String currency;

  @override
  Widget build(BuildContext context) {
    return TamiGlass(
      semanticLabel: '$label earnings',
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$currency ${(window.totalMinor / 100).toStringAsFixed(0)}',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text('$label · ${window.rides} rides'),
        ],
      ),
    );
  }
}
