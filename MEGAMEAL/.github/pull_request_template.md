## Description

Please provide a brief description of the changes in this pull request.

---

### GDD Compliance Checklist

**Instructions:** Before submitting, please check off each item to confirm that your changes adhere to the project's documented standards.

- [ ] **Code Quality:** The code follows all rules outlined in GDD Section 8.1, including strict TypeScript and no `any` types.
- [ ] **Component Rules:** New components correctly extend `BaseLevelComponent` and implement `onDispose` for memory management. (GDD Section 8.2)
- [ ] **ECS Best Practices:** The use of ECS vs. Svelte Components is consistent with the guidelines in GDD Section 8.3.
- [ ] **File Structure:** New files are placed in the correct directories as documented in GDD Section 4.
- [ ] **Documentation:** All new component `props` and public API methods include TSDoc comments for automated documentation generation.