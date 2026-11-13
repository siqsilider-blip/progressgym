package app.progrezzia.mobile;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyBrandSystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Algunos plugins vuelven a aplicar flags al reanudar la actividad.
        // Reafirmar la apariencia evita destellos claros al volver a la app.
        applyBrandSystemBars();
    }

    @SuppressWarnings("deprecation")
    private void applyBrandSystemBars() {
        final int surface = ContextCompat.getColor(this, R.color.progrezzia_surface);
        final Window window = getWindow();

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        // En Android 15/16 las barras pueden ser transparentes por la política
        // edge-to-edge. El fondo de la ventana y de la vista raíz garantiza que
        // se vea el color de marca también cuando estos setters son ignorados.
        window.setStatusBarColor(Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM
            ? Color.TRANSPARENT
            : surface);
        window.setNavigationBarColor(Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM
            ? Color.TRANSPARENT
            : surface);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(surface);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        window.getDecorView().setBackgroundColor(surface);
        final View content = findViewById(android.R.id.content);
        if (content != null) content.setBackgroundColor(surface);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(surface);
        }

        final WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            window,
            window.getDecorView()
        );
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}
