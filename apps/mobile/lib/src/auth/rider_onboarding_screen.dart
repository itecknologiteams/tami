import 'package:flutter/material.dart';

import '../features/rider/rider_booking_client.dart';
import '../features/rider/rider_chat_client.dart';
import '../features/rider/rider_shell.dart';
import '../features/rider/rider_ride_query_client.dart';
import '../features/rider/rider_saved_place_client.dart';
import '../features/rider/rider_pricing_client.dart';
import '../features/rider/rider_place_search_client.dart';
import '../location/rider_location_client.dart';
import '../ui/tami_colors.dart';
import '../ui/tami_glass.dart';
import '../ui/tami_route_ribbon.dart';
import 'rider_identity_client.dart';
import 'rider_session.dart';

class RiderOnboardingScreen extends StatefulWidget {
  const RiderOnboardingScreen({
    required this.client,
    this.bookingClient,
    this.chatClient,
    this.rideQueryClient,
    this.savedPlaceClient,
    this.pricingClient,
    this.locationClient,
    this.placeSearchClient,
    super.key,
  });

  final RiderIdentityClient client;
  final RiderBookingClient? bookingClient;
  final RiderChatClient? chatClient;
  final RiderRideQueryClient? rideQueryClient;
  final RiderSavedPlaceClient? savedPlaceClient;
  final RiderPricingClient? pricingClient;
  final RiderLocationClient? locationClient;
  final RiderPlaceSearchClient? placeSearchClient;

  @override
  State<RiderOnboardingScreen> createState() => _RiderOnboardingScreenState();
}

enum _OnboardingStep { phone, code, profile }

class _RiderOnboardingScreenState extends State<RiderOnboardingScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _imageUrlController = TextEditingController();

  _OnboardingStep _step = _OnboardingStep.phone;
  DevelopmentOtpChallenge? _challenge;
  RiderSession? _session;
  List<RiderCity> _cities = const [];
  String? _selectedCityId;
  String? _error;
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    await _run(() async {
      final cities = await widget.client.getActiveCities();
      final challenge = await widget.client.requestOtp(
        _phoneController.text.trim(),
      );
      setState(() {
        _cities = cities;
        _selectedCityId = cities.firstOrNull?.id;
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
      final session = await widget.client.verifyOtp(
        challengeId: challenge.challengeId,
        code: _codeController.text.trim(),
        cityId: cityId,
      );
      setState(() {
        _session = session;
        _nameController.text = session.rider.name ?? '';
        _emailController.text = session.rider.email ?? '';
        _imageUrlController.text = session.rider.imageUrl ?? '';
        _step = _OnboardingStep.profile;
      });
    });
  }

  Future<void> _saveProfile() async {
    final session = _session;
    final cityId = _selectedCityId;
    if (session == null || cityId == null) {
      return;
    }

    await _run(() async {
      final profile = await widget.client.updateProfile(
        accessToken: session.accessToken,
        cityId: cityId,
        name: _nameController.text.trim(),
        email: _emptyToNull(_emailController.text),
        imageUrl: _emptyToNull(_imageUrlController.text),
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => RiderShell(
            session: RiderSession(
              accessToken: session.accessToken,
              rider: profile,
            ),
            bookingClient: widget.bookingClient,
            chatClient: widget.chatClient,
            rideQueryClient: widget.rideQueryClient,
            savedPlaceClient: widget.savedPlaceClient,
            pricingClient: widget.pricingClient,
            locationClient: widget.locationClient,
            placeSearchClient: widget.placeSearchClient,
          ),
        ),
      );
    });
  }

  String? _emptyToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await action();
    } on RiderIdentityException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Unable to continue. Check your connection.');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final stepIndex = _step.index;

    return Scaffold(
      backgroundColor: TamiColors.mist,
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TAMI',
                    style: TextStyle(
                      color: TamiColors.civicGreen,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 24),
                  _JourneyRail(activeStep: stepIndex),
                  const SizedBox(height: 28),
                  Expanded(
                    child: ListView(
                      children: [
                        Text(
                          switch (_step) {
                            _OnboardingStep.phone => 'Verify your phone',
                            _OnboardingStep.code => 'Enter your code',
                            _OnboardingStep.profile => 'Complete your profile',
                          },
                          style: const TextStyle(
                            color: Color(0xFF18302B),
                            fontSize: 30,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          switch (_step) {
                            _OnboardingStep.phone =>
                              'Use the number you will ride with.',
                            _OnboardingStep.code =>
                              'Choose your city, then confirm the code.',
                            _OnboardingStep.profile =>
                              'Add the details riders and support teams will recognize.',
                          },
                          style: const TextStyle(
                            color: Color(0xFF55716A),
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 32),
                        TamiGlass(
                          key: const Key('onboarding-step-glass'),
                          semanticLabel: 'Onboarding details',
                          padding: const EdgeInsets.all(20),
                          child: switch (_step) {
                            _OnboardingStep.phone => _PhoneStep(
                              controller: _phoneController,
                            ),
                            _OnboardingStep.code => _CodeStep(
                              codeController: _codeController,
                              cities: _cities,
                              selectedCityId: _selectedCityId,
                              onCityChanged: (value) =>
                                  setState(() => _selectedCityId = value),
                              challenge: _challenge,
                            ),
                            _OnboardingStep.profile => _ProfileStep(
                              nameController: _nameController,
                              emailController: _emailController,
                              imageUrlController: _imageUrlController,
                            ),
                          },
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 20),
                          Text(
                            _error!,
                            style: const TextStyle(color: Color(0xFFB42318)),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: _isLoading
                          ? null
                          : switch (_step) {
                              _OnboardingStep.phone => _sendCode,
                              _OnboardingStep.code => _verifyCode,
                              _OnboardingStep.profile => _saveProfile,
                            },
                      child: Text(
                        _isLoading
                            ? 'Please wait'
                            : switch (_step) {
                                _OnboardingStep.phone => 'Send code',
                                _OnboardingStep.code => 'Verify code',
                                _OnboardingStep.profile => 'Save profile',
                              },
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(height: 2, color: const Color(0xFFD2DFDA)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _JourneyRail extends StatelessWidget {
  const _JourneyRail({required this.activeStep});

  final int activeStep;

  @override
  Widget build(BuildContext context) {
    const labels = ['Phone', 'Code', 'Profile'];
    return Column(
      children: [
        TamiRouteRibbon(
          key: const Key('onboarding-route-ribbon'),
          currentStep: activeStep,
          steps: labels.length,
        ),
        const SizedBox(height: 8),
        Row(
          children: List.generate(labels.length, (index) {
            final active = index <= activeStep;
            return Expanded(
              child: Text(
                labels[index],
                style: TextStyle(
                  color: active ? TamiColors.ink : const Color(0xFF7B9690),
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _PhoneStep extends StatelessWidget {
  const _PhoneStep({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return TextField(
      key: const Key('phone-input'),
      controller: controller,
      keyboardType: TextInputType.phone,
      decoration: const InputDecoration(
        labelText: 'Mobile number',
        hintText: '+92 300 1234567',
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
        ),
      ),
    );
  }
}

class _CodeStep extends StatelessWidget {
  const _CodeStep({
    required this.codeController,
    required this.cities,
    required this.selectedCityId,
    required this.onCityChanged,
    required this.challenge,
  });

  final TextEditingController codeController;
  final List<RiderCity> cities;
  final String? selectedCityId;
  final ValueChanged<String?> onCityChanged;
  final DevelopmentOtpChallenge? challenge;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (challenge != null)
          Text(
            'Development code: ${challenge!.developmentCode}',
            style: const TextStyle(
              color: Color(0xFF006C5B),
              fontWeight: FontWeight.w700,
            ),
          ),
        const SizedBox(height: 20),
        TextField(
          key: const Key('code-input'),
          controller: codeController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Six-digit code',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
        ),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          initialValue: selectedCityId,
          decoration: const InputDecoration(
            labelText: 'Service city',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
          items: cities
              .map(
                (city) =>
                    DropdownMenuItem(value: city.id, child: Text(city.name)),
              )
              .toList(),
          onChanged: onCityChanged,
        ),
      ],
    );
  }
}

class _ProfileStep extends StatelessWidget {
  const _ProfileStep({
    required this.nameController,
    required this.emailController,
    required this.imageUrlController,
  });

  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController imageUrlController;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          key: const Key('name-input'),
          controller: nameController,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Name',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('email-input'),
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email (optional)',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('image-url-input'),
          controller: imageUrlController,
          keyboardType: TextInputType.url,
          decoration: const InputDecoration(
            labelText: 'Profile image URL (optional)',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
        ),
      ],
    );
  }
}
