# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "Welcome back" [level=2] [ref=e10]
      - paragraph [ref=e11]: Sign in to your Social Selling account
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: Email address
          - textbox "Email address" [ref=e17]:
            - /placeholder: you@example.com
        - generic [ref=e18]:
          - generic [ref=e19]: Password
          - generic [ref=e20]:
            - textbox "Password" [ref=e21]:
              - /placeholder: ••••••••
            - button [ref=e22] [cursor=pointer]:
              - img [ref=e23]
        - link "Forgot password?" [ref=e28] [cursor=pointer]:
          - /url: /forgot-password
        - button "Sign in" [ref=e30] [cursor=pointer]
      - generic [ref=e35]: Or continue with
      - generic [ref=e36]:
        - button "Google" [ref=e37] [cursor=pointer]:
          - img [ref=e38]
          - text: Google
        - button "Instagram" [ref=e43] [cursor=pointer]:
          - img [ref=e44]
          - text: Instagram
    - paragraph [ref=e47]:
      - text: Don't have an account?
      - link "Sign up" [ref=e48] [cursor=pointer]:
        - /url: /register
  - alert [ref=e49]
```