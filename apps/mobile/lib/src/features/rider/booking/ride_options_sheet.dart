import 'package:flutter/material.dart';

import '../../../ui/tami_colors.dart';
import '../../../ui/tami_glass.dart';
import '../rider_booking_client.dart';
import '../rider_pricing_client.dart';
import 'tami_place.dart';

enum RideCategory { standard, womenFamily, airport, accessible }

class RideSelection {
  const RideSelection({
    required this.destination,
    required this.categoryCode,
    required this.paymentMethod,
    required this.scheduledPickupAt,
  });

  final TamiPlace destination;
  final String categoryCode;
  final RiderPaymentMethod paymentMethod;
  final DateTime? scheduledPickupAt;
}

class RideOptionsSheet extends StatefulWidget {
  const RideOptionsSheet({
    required this.destination,
    required this.onConfirm,
    required this.pickup,
    this.accessToken,
    this.pricingClient,
    this.onEstimate,
    super.key,
  });

  final TamiPlace destination;
  final Future<void> Function(RideSelection selection) onConfirm;
  final RiderCoordinates pickup;
  final String? accessToken;
  final RiderPricingClient? pricingClient;
  final ValueChanged<RiderFareEstimate>? onEstimate;

  @override
  State<RideOptionsSheet> createState() => _RideOptionsSheetState();
}

class _RideOptionsSheetState extends State<RideOptionsSheet> {
  RideCategory _category = RideCategory.standard;
  RiderPaymentMethod _paymentMethod = RiderPaymentMethod.cash;
  bool _isScheduled = false;
  bool _isSubmitting = false;
  String? _error;
  DateTime? _scheduledPickupAt;
  RiderFareEstimate? _estimate;
  bool _isEstimating = false;
  String? _estimateError;
  int _estimateRequest = 0;

  @override
  void initState() {
    super.initState();
    _loadEstimate();
  }

  Future<void> _loadEstimate() async {
    final client = widget.pricingClient;
    final token = widget.accessToken;
    if (client == null || token == null) {
      return;
    }
    final requestNumber = ++_estimateRequest;
    setState(() {
      _isEstimating = true;
      _estimateError = null;
    });
    try {
      final estimate = await client.estimateFare(
        accessToken: token,
        request: RiderFareEstimateRequest(
          categoryCode: _isScheduled
              ? 'scheduled_ride'
              : _categoryCode(_category),
          pickup: widget.pickup,
          destination: RiderCoordinates(
            latitude: widget.destination.latitude,
            longitude: widget.destination.longitude,
            address: widget.destination.address,
          ),
          scheduledPickupAt: _isScheduled ? _scheduledPickupAt : null,
        ),
      );
      if (mounted && requestNumber == _estimateRequest) {
        setState(() => _estimate = estimate);
        widget.onEstimate?.call(estimate);
      }
    } on RiderPricingException catch (error) {
      if (mounted && requestNumber == _estimateRequest) {
        setState(() {
          _estimate = null;
          _estimateError = error.message;
        });
      }
    } finally {
      if (mounted && requestNumber == _estimateRequest) {
        setState(() => _isEstimating = false);
      }
    }
  }

  Future<void> _confirm() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.onConfirm(
        RideSelection(
          destination: widget.destination,
          categoryCode: _isScheduled
              ? 'scheduled_ride'
              : _categoryCode(_category),
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
    _loadEstimate();
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
      child: Align(
        alignment: Alignment.bottomCenter,
        widthFactor: 1,
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: TamiGlass(
            key: const Key('ride-options-glass'),
            semanticLabel: 'Choose a ride',
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      color: const Color(0xFFB8CCC5),
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
                    children: RideCategory.values
                        .map(
                          (category) => ChoiceChip(
                            label: Text(_categoryLabel(category)),
                            selected: _category == category,
                            onSelected: (_) {
                              setState(() => _category = category);
                              _loadEstimate();
                            },
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
                      _loadEstimate();
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
                  DropdownButtonFormField<RiderPaymentMethod>(
                    initialValue: _paymentMethod,
                    decoration: const InputDecoration(
                      labelText: 'Payment method',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                      ),
                    ),
                    items: RiderPaymentMethod.values
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
                    decoration: BoxDecoration(
                      color: TamiColors.mist.withValues(alpha: 0.82),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.receipt_long_outlined),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isEstimating
                                    ? 'Calculating fare'
                                    : 'Estimated fare',
                              ),
                              Text(
                                _estimate == null
                                    ? 'Fare unavailable'
                                    : _formatFare(_estimate!),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_estimate?.explanationLines.isNotEmpty ?? false)
                          Flexible(
                            child: Text(
                              _estimate!.explanationLines.last,
                              textAlign: TextAlign.end,
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (_estimateError != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _estimateError!,
                            style: const TextStyle(color: TamiColors.danger),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Retry fare estimate',
                          onPressed: _loadEstimate,
                          icon: const Icon(Icons.refresh),
                        ),
                      ],
                    ),
                  ],
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
                      onPressed:
                          _isSubmitting || _isEstimating || _estimate == null
                          ? null
                          : _confirm,
                      child: Text(
                        _isSubmitting ? 'Requesting ride' : 'Confirm ride',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _categoryLabel(RideCategory category) {
    return switch (category) {
      RideCategory.standard => 'Standard Taxi',
      RideCategory.womenFamily => 'Women/Family',
      RideCategory.airport => 'Airport',
      RideCategory.accessible => 'Accessible',
    };
  }

  String _formatFare(RiderFareEstimate estimate) {
    final amount = estimate.fareMinor / 100;
    final formatted = amount == amount.roundToDouble()
        ? amount.toStringAsFixed(0)
        : amount.toStringAsFixed(2);
    return '${estimate.currency} $formatted';
  }

  String _categoryCode(RideCategory category) {
    return switch (category) {
      RideCategory.standard => 'standard_taxi',
      RideCategory.womenFamily => 'women_family_preferred',
      RideCategory.airport => 'airport',
      RideCategory.accessible => 'accessible_special_assistance',
    };
  }

  String _paymentLabel(RiderPaymentMethod method) {
    return switch (method) {
      RiderPaymentMethod.cash => 'Cash',
      RiderPaymentMethod.jazzCash => 'JazzCash',
      RiderPaymentMethod.easypaisa => 'Easypaisa',
      RiderPaymentMethod.nayapay => 'NayaPay',
    };
  }
}
