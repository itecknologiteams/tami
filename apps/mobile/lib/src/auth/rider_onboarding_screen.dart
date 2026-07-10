import 'package:flutter/material.dart';

import '../features/rider/rider_home_screen.dart';
import 'rider_identity_client.dart';
import 'rider_session.dart';

class RiderOnboardingScreen extends StatefulWidget {
  const RiderOnboardingScreen({required this.client, super.key});

  final RiderIdentityClient client;

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
      final challenge = await widget.client.requestOtp(_phoneController.text.trim());
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
      await widget.client.updateProfile(
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
        MaterialPageRoute<void>(builder: (_) => const RiderHomeScreen()),
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
    const riverGreen = Color(0xFF006C5B);
    const signalYellow = Color(0xFFF2BC3D);
    const mist = Color(0xFFE4EFEA);
    final stepIndex = _step.index;

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF7),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TAMI',
                style: TextStyle(
                  color: riverGreen,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 24),
              _JourneyRail(activeStep: stepIndex, accent: signalYellow),
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
                        _OnboardingStep.phone => 'Use the number you will ride with.',
                        _OnboardingStep.code => 'Choose your city, then confirm the code.',
                        _OnboardingStep.profile => 'Add the details riders and support teams will recognize.',
                      },
                      style: const TextStyle(color: Color(0xFF55716A), fontSize: 16),
                    ),
                    const SizedBox(height: 32),
                    if (_step == _OnboardingStep.phone)
                      _PhoneStep(controller: _phoneController)
                    else if (_step == _OnboardingStep.code)
                      _CodeStep(
                        codeController: _codeController,
                        cities: _cities,
                        selectedCityId: _selectedCityId,
                        onCityChanged: (value) => setState(() => _selectedCityId = value),
                        challenge: _challenge,
                      )
                    else
                      _ProfileStep(
                        nameController: _nameController,
                        emailController: _emailController,
                        imageUrlController: _imageUrlController,
                      ),
                    if (_error != null) ...[
                      const SizedBox(height: 20),
                      Text(_error!, style: const TextStyle(color: Color(0xFFB42318))),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading
                      ? null
                      : switch (_step) {
                          _OnboardingStep.phone => _sendCode,
                          _OnboardingStep.code => _verifyCode,
                          _OnboardingStep.profile => _saveProfile,
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: riverGreen,
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.all(Radius.circular(8)),
                    ),
                  ),
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
              Container(height: 2, color: mist),
            ],
          ),
        ),
      ),
    );
  }
}

class _JourneyRail extends StatelessWidget {
  const _JourneyRail({required this.activeStep, required this.accent});

  final int activeStep;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    const labels = ['Phone', 'Code', 'Profile'];
    return Row(
      children: List.generate(labels.length, (index) {
        final active = index <= activeStep;
        return Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 4,
                color: active ? accent : const Color(0xFFD7E4DF),
              ),
              const SizedBox(height: 7),
              Text(
                labels[index],
                style: TextStyle(
                  color: active ? const Color(0xFF18302B) : const Color(0xFF7B9690),
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      }),
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
        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
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
            border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
          ),
        ),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          initialValue: selectedCityId,
          decoration: const InputDecoration(
            labelText: 'Service city',
            border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
          ),
          items: cities
              .map(
                (city) => DropdownMenuItem(value: city.id, child: Text(city.name)),
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
            border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('email-input'),
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email (optional)',
            border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('image-url-input'),
          controller: imageUrlController,
          keyboardType: TextInputType.url,
          decoration: const InputDecoration(
            labelText: 'Profile image URL (optional)',
            border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
          ),
        ),
      ],
    );
  }
}
