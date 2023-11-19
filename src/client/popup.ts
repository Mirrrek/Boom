export default function popup(message: string) {
    requestAnimationFrame(() => {
        const popups = document.getElementById('popups') as HTMLDivElement;
        const popup = document.createElement('p');
        popup.textContent = message;
        popup.style.opacity = '0';
        popups.appendChild(popup);

        requestAnimationFrame(() => {
            popup.style.opacity = '1';
        });

        setTimeout(() => {
            requestAnimationFrame(() => {
                popups.style.transition = 'top 0.5s ease-in-out';
                popup.style.opacity = '0';
                requestAnimationFrame(() => {
                    popups.style.top = `${parseFloat(popups.style.top.replace('px', '')) - popup.clientHeight - 16}px`;

                    setTimeout(() => {
                        requestAnimationFrame(() => {
                            popups.style.transition = '';
                            requestAnimationFrame(() => {
                                popups.style.top = `${parseFloat(popups.style.top.replace('px', '')) + popup.clientHeight + 16}px`;
                                popup.remove();
                            });
                        });
                    }, 1000);
                });
            });
        }, 5000);
    });
}
