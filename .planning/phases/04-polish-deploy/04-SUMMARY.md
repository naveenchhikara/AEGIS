# Phase 4 Planning Summary

**Planned:** February 7, 2026
**Status:** Ready for execution
**Total Plans:** 7 implementation plans across 7 waves

## Wave Organization

| Wave | Plan | Purpose | Dependencies | Checkpoint |
|------|------|---------|--------------|------------|
| 1 | 04-01 | i18n Foundation with next-intl | Phase 3 complete | No |
| 2 | 04-02 | Translation Content for All UI Labels | 04-01 | No |
| 3 | 04-03 | Language Switcher UI Component | 04-01, 04-02 | No |
| 4 | 04-04 | Responsive Design Polish | 04-03 | **Yes** |
| 5 | 04-05 | AWS Infrastructure Setup | 04-04 | **Yes** |
| 6 | 04-06 | SSL Certificate and Domain Configuration | 04-05 | **Yes** |
| 7 | 04-07 | Application Deployment and Demo Preparation | 04-05, 04-06 | **Yes** |

## Execution Pattern

- **Waves 1-3:** Can execute sequentially without human intervention (autonomous)
- **Waves 4-7:** Include human verification checkpoints before proceeding
- **Total estimated time:** 2-3 days for waves 1-4, 1-2 days for deployment (waves 5-7)

## Key Technologies

| Area | Technology |
|------|------------|
| i18n Framework | next-intl 3.x |
| Languages | EN, HI, MR, GU |
| Deployment Target | AWS Lightsail Mumbai (ap-south-1) |
| Process Manager | PM2 |
| Web Server | Nginx |
| SSL | Let's Encrypt (Certbot) |

## Requirements Coverage

| Requirement | Plan |
|-------------|------|
| I18N-01 (translations) | 04-02, 04-03 |
| I18N-02 (language switcher) | 04-03 |
| I18N-03 (banking terminology) | 04-02 (with expert review note) |
| RPT-06 (print/PDF preview) | 04-04 |

## Success Criteria (14 total)

1. All UI labels have Hindi, Marathi, Gujarati translations
2. Language switcher in top bar persists preference
3. Switching language updates all visible labels immediately
4. Banking terminology is correctly translated
5. All screens are mobile-friendly
6. No horizontal scrolling on any screen size
7. Touch targets are large enough on mobile
8. Application deployed to AWS Lightsail Mumbai
9. SSL certificate configured and valid
10. Custom domain configured
11. Production URL loads all screens correctly
12. Demo works on mobile devices
13. Demo works on tablets
14. Demo script is ready (15-min and 30-min versions)

## File Impact Summary

| Plan | Files Created | Files Modified |
|------|---------------|----------------|
| 04-01 | 9 files | 0 files |
| 04-02 | 4 files | 1 file |
| 04-03 | 1 file | 4+ files |
| 04-04 | 3 files | 6+ files |
| 04-05 | 5 items | 2 files |
| 04-06 | 5 items | 1 file |
| 04-07 | 2 files | 0 files |

## Prerequisites for Execution

1. **Domain name** - Must be purchased and DNS configured before wave 6
2. **AWS account** - Active account with ability to create Lightsail instances
3. **SSH access** - Ability to connect to Lightsail via SSH
4. **Phase 3 completion** - All application screens must be built first

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DNS propagation delay | Wave 6 blocked | Purchase domain early; allow 48 hours |
| Banking translation quality | Misunderstood compliance terms | Flag for expert review; note in code |
| SSL certificate issues | HTTPS not working | Use Certbot dry-run; check domain first |
| Mobile browser bugs | Responsive issues | Test on real devices, not emulation |

---

*Phase 4 planning complete. Execute with `/gsd:execute-phase 4`*
