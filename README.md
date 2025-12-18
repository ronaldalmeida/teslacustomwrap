# Tesla Custom Wrap Designer

Create and visualize custom wraps for your Tesla vehicle. This tool helps you design patterns and see how they look on official Tesla vehicle templates.

## Credits
This project is based on the official [Tesla Custom Wraps](https://github.com/teslamotors/custom-wraps) repository. We thank Tesla for providing the official 3D vehicle visualization templates.

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open the designer**:
   Navigate to [http://localhost:5173](http://localhost:5173).

---

## Deployment (Cloudflare Pages)

### Automatic Deployment (GitHub)
1.  Connect your GitHub repository to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Use the following **Build Settings**:
    - **Framework Preset**: `Vite`
    - **Build Command**: `npm run build`
    - **Build Output Directory**: `dist`
3.  Pushes to `main` will automatically deploy to your production URL.

### Manual CLI Deployment
If you prefer to deploy from your terminal:

1.  **Build the project**:
    ```bash
    npm run build
    ```

2.  **Deploy for the first time**:
    ```bash
    npx wrangler pages deploy dist --project-name=teslacustomwrap
    ```

3.  **Deploy updates**:
    ```bash
    npx wrangler pages deploy dist
    ```

---

## Custom Domain

This project is intended to be hosted at **[teslacustomwrap.com](https://teslacustomwrap.com)**.

### How to connect:
1.  In the Cloudflare Dashboard, go to your Pages project.
2.  Click the **Custom domains** tab at the top.
3.  Click **Set up a custom domain**.
4.  Enter `teslacustomwrap.com` and follow the prompts to activate it.
