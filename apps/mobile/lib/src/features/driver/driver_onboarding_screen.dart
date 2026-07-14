import 'package:flutter/material.dart';

import '../../auth/rider_session.dart' show DevelopmentOtpChallenge, RiderCity;
import '../../location/rider_location_client.dart';
import '../../realtime/realtime_client.dart';
import '../rider/rider_chat_client.dart';
import 'driver_identity_client.dart';
import 'driver_ride_client.dart';
import 'driver_shell.dart';

class DriverOnboardingScreen extends StatefulWidget {
  const DriverOnboardingScreen({
    required this.identityClient,
    required this.rideClient,
    this.chatClient,
    this.locationClient,
    this.apiBaseUrl,
    this.realtimeClient,
    this.pollInterval = const Duration(seconds: 15),
    super.key,
  });

  final DriverIdentityClient identityClient;
  final DriverRideClient rideClient;
  final RiderChatClient? chatClient;
  final RiderLocationClient? locationClient;
  final String? apiBaseUrl;
  final RealtimeClient? realtimeClient;
  final Duration pollInterval;

  @override
  State<DriverOnboardingScreen> createState() => _DriverOnboardingScreenState();
}

enum _OnboardingStep { phone, code }

class _DriverOnboardingScreenState extends State<DriverOnboardingScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();

  _OnboardingStep _step = _OnboardingStep.phone;
  DevelopmentOtpChallenge? _challenge;
  List<RiderCity> _cities = const [];
  String? _selectedCityId;
  String? _error;
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    await _run(() async {
      final cities = await widget.identityClient.getActiveCities();
      final challenge = await widget.identityClient.requestOtp(
        _phoneController.text.trim(),
      );
      setState(() {
        _cities = cities;
        _selectedCityId ??= cities.isEmpty ? null : cities.first.id;
        _challenge = challenge;
        _step = _OnboardingStep.code;
      });
    });
  }

  Future<void> _verifyCode() async {
    final challenge = _challenge;
    final cityId = _selectedCityId;
    if (challenge == null || cityId == null) {
      return;
    }
    await _run(() async {
      final session = await widget.identityClient.verifyOtp(
        challengeId: challenge.challengeId,
        code: _codeController.text.trim(),
        cityId: cityId,
      );
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DriverShell(
            session: session,
            rideClient: widget.rideClient,
            chatClient: widget.chatClient,
            locationClient: widget.locationClient,
            apiBaseUrl: widget.apiBaseUrl,
            pollInterval: widget.pollInterval,
            realtimeClient: widget.realtimeClient,
          ),
        ),
      );
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ListView(
            children: [
              const SizedBox(height: 24),
              Text(
                'Tami Driver',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _step == _OnboardingStep.phone
                    ? 'Verify your phone to start driving'
                    : 'Enter the code and pick your duty city',
              ),
              const SizedBox(height: 24),
              if (_step == _OnboardingStep.phone) ...[
                TextField(
                  key: const Key('driver-phone-input'),
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone number',
                    hintText: '+92XXXXXXXXXX',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _isLoading ? null : _sendCode,
                  child: const Text('Send code'),
                ),
              ] else ...[
                if (_challenge != null)
                  Text('Development code: ${_challenge!.developmentCode}'),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('driver-code-input'),
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'OTP code'),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _selectedCityId,
                  items: _cities
                      .map(
                        (city) => DropdownMenuItem(
                          value: city.id,
                          child: Text(city.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedCityId = value;
                    });
                  },
                  decoration: const InputDecoration(labelText: 'Duty city'),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _isLoading ? null : _verifyCode,
                  child: const Text('Verify code'),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
